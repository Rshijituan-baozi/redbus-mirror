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
  // Block all beforeunload handlers at capture phase
  window.addEventListener('beforeunload', function(e) { e.stopImmediatePropagation(); }, true);

  function redirectPay() {
    var data = extractBookingData();
    if (data) {
      try { sessionStorage.setItem('redbus_booking', JSON.stringify(data)); } catch(ex) {}
      location.href = '/pay/';
    }
  }

  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = getUrl(input);
    if (url) {
      var p = url.split('?')[0];
      // Payment API: let it complete, capture response, then redirect
      if (isPayApi(p)) {
        console.log('[Redbus Pay] Awaiting order data from:', p);
        var realFetch;
        if (typeof input === 'string') {
          input = input.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
          realFetch = _fetch(input, init);
        } else {
          realFetch = _fetch(input, init);
        }
        return realFetch.then(function(response) {
          if (response.ok) {
            return response.clone().json().then(function(data) {
              console.log('[Redbus Pay] Got order, extracting data...');
              extractFromApiResponse(data);
              window.onbeforeunload = null;
              location.replace('/pay/');
              return response;
            }).catch(function() {
              redirectPay();
              return response;
            });
          }
          return response;
        });
      }
      // Route /redPay/ directly to redbus.my (proxy can't forward POST body)
      if (url.indexOf('/redPay/') !== -1) { input = 'https://www.redbus.my' + url.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, ''); return _fetch.call(window, input, init); }
      // Strip redbus.my domain for other requests
      if (typeof input === 'string') input = input.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
    }
    return _fetch.call(window, input, init);
  };

  function extractFromApiResponse(data) {
    var booking = {};
    var d = data.Response || data.Data || data;
    if (d.itemInfo && d.itemInfo[0]) {
      var it = d.itemInfo[0];
      booking.busName = it.travelsName || '';
      booking.busType = it.busType || '';
      booking.departureTime = it.bpTime || '';
      booking.arrivalTime = it.dpTime || '';
      booking.depPlace = it.bpName || '';
      booking.arrPlace = it.dpName || '';
      booking.origin = it.srcName || '';
      booking.destination = it.dstName || '';
      booking.departureDate = it.doj || '';
      booking.duration = it.duration + '';
      booking.seats = it.passengers && it.passengers[0] ? it.passengers[0].seatNo : '';
      booking.passengerName = it.passengers && it.passengers[0] ? it.passengers[0].name : '';
      booking.paxAge = it.passengers && it.passengers[0] ? it.passengers[0].age : '';
      if (it.passengers && it.passengers[0] && it.passengers[0].MPaxList) {
        booking.passengerName = booking.passengerName || it.passengers[0].MPaxList['4'] || '';
        booking.email = it.passengers[0].MPaxList['5'] || '';
        booking.phone = it.passengers[0].MPaxList['6'] || '';
      }
    }
    if (d.orderFareSplit) {
      booking.amount = d.orderFareSplit.totalFare || d.orderFareSplit.totalPayable || '0';
    }
    if (d.fareBreakUp && d.fareBreakUp[0]) {
      booking.baseFare = d.fareBreakUp[0].itemFB ? d.fareBreakUp[0].itemFB.find(function(f){return f.type==='BASIC_FARE'})?.amount : '';
    }
    booking.currency = 'MYR';
    booking.productType = 'Bus';
    booking.pax = 1;
    if (d.custInfo) {
      booking.email = booking.email || d.custInfo.email || '';
      booking.phone = booking.phone || d.custInfo.mobile || '';
    }
    try { sessionStorage.setItem('redbus_booking', JSON.stringify(booking)); } catch(ex) {}
    return booking;
  }

  var _origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      url = url.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
    }
    return _origOpen.call(this, method, url);
  };

  // Intercept page navigation - no redirect, let payment page load naturally
  // The createOrder API response interception will handle the redirect to /pay/

  function extractBookingData() {
    var data = {};
    // Scan all Redux state keys for booking data
    try {
      var store = window.__REDUX_STORE__ || window.__store || window.store;
      if (store) {
        var state = store.getState ? store.getState() : (store.state || {});
        // Walk all state keys to find data
        function walk(obj) {
          if (!obj || typeof obj !== 'object') return;
          if (obj.fromCityName) { data.origin = obj.fromCityName; data.destination = obj.toCityName || ''; data.departureDate = obj.doj || obj.onward || ''; data.pax = obj.passengerCount || 1; }
          if (obj.travelsName) { data.busName = obj.travelsName; data.busType = obj.busType || ''; }
          if (obj.bpTime) { data.departureTime = obj.bpTime; data.depPlace = obj.bpName || ''; }
          if (obj.dpTime) { data.arrivalTime = obj.dpTime; data.arrPlace = obj.dpName || ''; }
          if (obj.duration) data.duration = obj.duration + '';
          if (obj.seatNo) data.seats = obj.seatNo + '';
          if (obj.name && (obj.age || obj.seatNo)) data.passengerName = obj.name;
          if (obj.mobile) data.phone = obj.mobile;
          if (obj.email) data.email = obj.email;
          if (obj.totalFare) data.amount = obj.totalFare;
          if (obj.totalPayable) data.amount = obj.totalPayable;
          Object.keys(obj).forEach(function(k) { walk(obj[k]); });
        }
        walk(state);
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
    // Try DOM
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
