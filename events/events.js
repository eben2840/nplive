// Draws the events page from NPEvents (data.js): every event as the same card, upcoming ones
// first, then the past ones. All text is set with textContent, never as HTML.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var DAY = 864e5;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function part(ev, options) {
    options.timeZone = ev.zone;
    return new Intl.DateTimeFormat('en-GB', options).format(ev.start);
  }

  function dayOf(date, zone) { return date.toLocaleDateString('en-CA', { timeZone: zone }); }

  // "Today, 28 Nov | 18:00", with the weekday once it is further away.
  function whenLabel(ev) {
    var day = dayOf(ev.start, ev.zone), now = new Date();
    var name = day === dayOf(now, ev.zone) ? 'Today'
      : day === dayOf(new Date(now.getTime() + DAY), ev.zone) ? 'Tomorrow' : part(ev, { weekday: 'short' });
    return name + ', ' + part(ev, { day: 'numeric', month: 'short', year: ev.past ? 'numeric' : undefined }) +
      ' | ' + part(ev, { hour: '2-digit', minute: '2-digit' });
  }

  // An upcoming event links to its booking page; a past one is only shown.
  function card(ev) {
    var box = el(ev.past ? 'div' : 'a', 'card');
    if (!ev.past) box.href = '/booking/?id=' + ev.id;
    var pic = el('div', 'pic'), text = el('div', 'txt');
    if (ev.cover) {
      var img = el('img');
      img.alt = ''; img.loading = 'lazy'; img.src = ev.cover;
      img.onerror = function () { img.remove(); };
      pic.append(img);
    }
    if (ev.past || ev.soldOut) pic.append(el('b', 'badge', ev.past ? 'Past' : 'Sold out'));
    text.append(el('span', 'when', whenLabel(ev)), el('h3', '', ev.title), el('span', 'where', ev.place),
      el('span', 'price', ev.price));
    if (ev.mode) text.append(el('span', 'tag', ev.mode));
    box.append(pic, text);
    return box;
  }

  function fill(section, list, events) {
    events.forEach(function (ev) { $(list).append(card(ev)); });
    $(section).hidden = !events.length;
  }

  window.NPEvents.load().then(function (events) {
    fill('upcoming', 'upcoming-list', events.filter(function (ev) { return !ev.past; }));
    fill('past', 'past-list', events.filter(function (ev) { return ev.past; }).reverse());
    $('note').hidden = events.length > 0;
    $('note').textContent = 'No events yet.';
  }).catch(function () { $('note').textContent = 'Could not load the events. Please reload the page.'; });
})();
