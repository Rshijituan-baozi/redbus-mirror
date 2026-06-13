(function(global) {
  'use strict';

  function normalizePhone(phone) {
    if (!phone) return '';
    var raw = String(phone).trim();
    var digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.indexOf('+') === 0) return '+' + digits;
    if (digits.indexOf('60') === 0) return '+' + digits;
    return '+60' + digits;
  }

  function readContact() {
    var email = '';
    var phone = '';
    try {
      var u = JSON.parse(localStorage.getItem('userContactDetails') || '{}');
      if (u.email && u.email.value) email = String(u.email.value).trim().toLowerCase();
      if (u.mobile && u.mobile.value) phone = normalizePhone(u.mobile.value);
    } catch (e) {}
    try {
      var emailEl = document.getElementById('email');
      var phoneEl = document.getElementById('phone');
      if (emailEl && emailEl.value) email = String(emailEl.value).trim().toLowerCase();
      if (phoneEl && phoneEl.value) phone = normalizePhone(phoneEl.value);
    } catch (e) {}
    return { email: email, phone_number: phone };
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

  function ttIdentifyFromContact() {
    if (!global.ttq) return;
    var contact = readContact();
    var identify = {};
    if (contact.email) identify.email = contact.email;
    if (contact.phone_number) identify.phone_number = contact.phone_number;
    if (Object.keys(identify).length) global.ttq.identify(identify);
  }

  function trackTtEvent(eventName, booking, extra) {
    if (!global.ttq) return;
    ttIdentifyFromContact();
    var payload = buildTtContents(booking);
    if (extra) {
      Object.keys(extra).forEach(function(key) {
        payload[key] = extra[key];
      });
    }
    global.ttq.track(eventName, payload);
  }

  global.RedbusTtPixel = {
    buildTtContents: buildTtContents,
    ttIdentifyFromContact: ttIdentifyFromContact,
    trackTtEvent: trackTtEvent,
    readContact: readContact
  };
})(typeof window !== 'undefined' ? window : this);
