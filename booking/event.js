// Draws the event for ?id= (flyer, title, date, place, notes) and one row per bookable ticket,
// then shows the booking form of book.js. All text set with textContent, never as HTML.
(function () {
  var NP = window.NP;
  if (!NP) return;
  var $ = NP.$;
  var MODES = { in_person: 'In-person event', online: 'Online event', hybrid: 'Hybrid event' };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  // Fills a text and hides its box when the event has nothing for it.
  function fill(id, text, box) {
    var value = (text || '').trim();
    $(id).textContent = value;
    $(box || id).hidden = !value;
    return !!value;
  }

  function dateLine(label, iso, zone) {
    var line = el('li');
    line.append(el('b', '', label + ' '), new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long',
      year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: zone || 'Europe/Berlin' }).format(new Date(iso)));
    return line;
  }

  function drawEvent(e) {
    var cover = e.cover_image_path || '';
    if (/^https:\/\//.test(cover)) {
      $('wb-image').onerror = function () { $('ev-frame').hidden = true; };
      $('wb-image').alt = e.title;
      $('wb-image').src = cover;
      $('ev-frame').hidden = false;
    }
    $('ev-title').textContent = e.title;
    [MODES[e.mode], e.organizer_name].forEach(function (chip) {
      if (chip) $('ev-chips').append(el('span', '', chip));
    });
    $('ev-dates').append(dateLine('From:', e.starts_at, e.time_zone));
    if (e.ends_at) $('ev-dates').append(dateLine('To:', e.ends_at, e.time_zone));
    var street = [e.street, e.house_number].filter(Boolean).join(' ');
    var town = [e.postal_code, e.city].filter(Boolean).join(' ');
    fill('ev-address', [street, town].filter(Boolean).join(', '));
    $('ev-place').hidden = !fill('ev-venue', e.venue_name) && $('ev-address').hidden;
    var note = fill('ev-note', e.attendee_instructions, 'ev-note-box');
    $('ev-facts').hidden = !fill('ev-cancel', e.cancellation_policy, 'ev-cancel-box') && !note;
    fill('ev-text', e.description, 'ev-about');
    $('ev-head').hidden = $('ev-when').hidden = false;
  }

  function ticketRow(t) {
    var atDoor = t.is_reserved && t.gross_price_cents;
    var row = el('label', 'tix');
    var input = el('input');
    input.type = 'radio'; input.name = 'wb-type'; input.value = t.id; input.required = true;
    input.disabled = t.quantity_total - t.quantity_reserved <= 0;
    if (t.is_private) input.dataset.private = '1';
    row.append(input, el('span', 'tix-name', t.name),
      el('span', 'tix-price', atDoor ? '€' + (t.gross_price_cents / 100).toFixed(2) : 'Free'),
      el('span', 'tix-sub', t.is_private ? 'Private · access code needed' : atDoor ? 'Pay at the door' : 'Free ticket'),
      el('span', 'tix-state'));
    return row;
  }

  // The access code field shows only while a private ticket is selected.
  function syncAccess() {
    var type = document.querySelector('input[name="wb-type"]:checked');
    $('wb-access-box').hidden = !(type && type.dataset.private);
    $('wb-access').required = !$('wb-access-box').hidden;
  }

  async function load() {
    var events = await NP.api('/rest/v1/events?select=title,status,description,cover_image_path,' +
      'organizer_name,mode,starts_at,ends_at,time_zone,venue_name,street,house_number,postal_code,city,' +
      'attendee_instructions,cancellation_policy&id=eq.' + NP.eventId);
    // A sold-out event still shows, with every ticket marked as sold out.
    if (!events.length || ['published', 'sold_out'].indexOf(events[0].status) < 0) return;
    var types = await NP.api('/rest/v1/ticket_types?select=id,name,gross_price_cents,is_free,is_reserved,' +
      'is_private,quantity_total,quantity_reserved&order=sort_order&event_id=eq.' + NP.eventId);
    var open = types.filter(function (t) { return t.is_free; }); // private ones ask for their code
    if (!open.length) return;
    drawEvent(events[0]);
    open.forEach(function (t) { $('wb-types').append(ticketRow(t)); });
    var first = $('wb-types').querySelector('input:not(:disabled)');
    if (first) first.checked = true; else $('wb-form').querySelector('button').disabled = true;
    $('wb-types').addEventListener('change', syncAccess); syncAccess();
    $('webbook').hidden = false;
    document.querySelector('main').classList.add('two'); // two columns once there is an event
  }

  load().catch(function () {}).then(NP.settle);
})();
