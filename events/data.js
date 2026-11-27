// Loads the public events and their ticket prices from the NP database and shapes them for
// the events page. Plain fetch, no library; the key is the public one the app also uses,
// and the database rules decide what it may read.
(function () {
  var BASE = 'https://dcnnaoygtxswlhctyktc.supabase.co/rest/v1/';
  var KEY = 'sb_publishable_T-0xOKcMcfv7LaElPlf_MQ__IUyoF64';
  var MODES = { in_person: 'In person', online: 'Online', hybrid: 'Hybrid' };

  async function get(path) {
    var res = await fetch(BASE + path, { headers: { apikey: KEY } });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  function euro(cents) { return '€' + (cents / 100).toFixed(2); }

  // "Free", one price or the range of the public tickets; "at the door" when it is paid there.
  function priceOf(types) {
    var open = types.filter(function (t) { return !t.is_private; });
    if (!open.length) return '';
    var cents = open.map(function (t) { return t.gross_price_cents || 0; });
    var low = Math.min.apply(null, cents), high = Math.max.apply(null, cents);
    if (high === 0) return 'Free';
    var range = low === high ? euro(high) : euro(low) + ' to ' + euro(high);
    return range + (open.some(function (t) { return t.is_reserved; }) ? ' at the door' : '');
  }

  function shape(event, types) {
    var cover = event.cover_image_path || '';
    return {
      id: event.id,
      title: event.title,
      start: new Date(event.starts_at),
      zone: event.time_zone || 'Europe/Berlin',
      past: new Date(event.ends_at || event.starts_at) < new Date() || event.status !== 'published' &&
        event.status !== 'sold_out',
      soldOut: event.status === 'sold_out',
      cover: /^https:\/\//.test(cover) ? cover : '',
      place: [event.venue_name, event.city].map(function (part) { return (part || '').trim(); })
        .filter(Boolean).join(' · '),
      price: priceOf(types),
      mode: MODES[event.mode] || ''
    };
  }

  window.NPEvents = {
    // Every public event, oldest first, each with its price line.
    load: async function () {
      var events = await get('events?select=id,title,status,cover_image_path,starts_at,ends_at,' +
        'time_zone,venue_name,city,mode&visibility=eq.public' +
        '&status=in.(published,sold_out,completed,closed)&order=starts_at.asc');
      var ids = events.map(function (event) { return event.id; });
      var types = ids.length ? await get('ticket_types?select=event_id,gross_price_cents,' +
        'is_reserved,is_private&event_id=in.(' + ids.join(',') + ')') : [];
      return events.map(function (event) {
        return shape(event, types.filter(function (t) { return t.event_id === event.id; }));
      });
    }
  };
})();
