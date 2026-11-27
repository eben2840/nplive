// Draws the events page from NPEvents (data.js): the next event large, the other upcoming
// ones as cards, past ones in a row; the search box and day filters narrow them down.
// All text is set with textContent, never as HTML.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var DAY = 864e5, all = [], when = 'all';

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
  function card(ev, feature) {
    var box = el(ev.past ? 'div' : 'a', 'card' + (feature ? ' feature' : ''));
    if (!ev.past) box.href = '/booking/?id=' + ev.id;
    var pic = el('div', 'pic'), text = el('div', 'txt');
    if (ev.cover) {
      var img = el('img');
      img.alt = ''; img.loading = 'lazy'; img.src = ev.cover;
      img.onerror = function () { img.remove(); };
      pic.append(img);
    }
    if (ev.past || ev.soldOut) pic.append(el('b', 'badge', ev.soldOut && !ev.past ? 'Sold out' : 'Past'));
    text.append(el('span', 'when', whenLabel(ev)), el('h3', '', ev.title), el('span', 'where', ev.place),
      el('span', 'price', ev.price));
    if (ev.mode) text.append(el('span', 'tag', ev.mode));
    if (feature) text.append(el('span', 'go', ev.soldOut ? 'See the event' : 'Reserve your ticket'));
    box.append(pic, text);
    return box;
  }

  function matches(ev) {
    var query = $('search').value.trim().toLowerCase();
    if (query && (ev.title + ' ' + ev.place).toLowerCase().indexOf(query) < 0) return false;
    if (when === 'all') return true;
    var now = new Date(), day = dayOf(ev.start, ev.zone);
    if (when === 'today') return !ev.past && day === dayOf(now, ev.zone);
    if (when === 'tomorrow') return !ev.past && day === dayOf(new Date(now.getTime() + DAY), ev.zone);
    var weekday = part(ev, { weekday: 'short' }); // the coming Saturday and Sunday
    return !ev.past && (weekday === 'Sat' || weekday === 'Sun') && ev.start - now < 7 * DAY;
  }

  function draw() {
    var shown = all.filter(matches);
    var upcoming = shown.filter(function (ev) { return !ev.past; });
    var past = shown.filter(function (ev) { return ev.past; }).reverse();
    $('featured').replaceChildren.apply($('featured'), upcoming.slice(0, 1).map(function (ev) { return card(ev, true); }));
    $('upcoming-list').replaceChildren.apply($('upcoming-list'), upcoming.slice(1).map(function (ev) { return card(ev); }));
    $('past-list').replaceChildren.apply($('past-list'), past.map(function (ev) { return card(ev); }));
    $('featured').hidden = !upcoming.length;
    $('upcoming').hidden = upcoming.length < 2;
    $('past').hidden = !past.length;
    $('note').hidden = shown.length > 0;
    $('note').textContent = all.length ? 'No events match. Try another day or search.' : 'No events yet.';
  }

  $('search').addEventListener('input', draw);
  $('chips').addEventListener('click', function (e) {
    var chip = e.target.closest('button');
    if (!chip) return;
    when = chip.dataset.when;
    Array.prototype.forEach.call($('chips').children, function (b) { b.classList.toggle('on', b === chip); });
    draw();
  });

  window.NPEvents.load().then(function (events) { all = events; draw(); })
    .catch(function () { $('note').textContent = 'Could not load the events. Please reload the page.'; });
})();
