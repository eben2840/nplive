// Door check-in for Session 004: scan or search, check in, mark paid. The key after # is sent
// with every request; the door-checkin function refuses everything without it.
'use strict';
(() => {
  const FN = 'https://dcnnaoygtxswlhctyktc.supabase.co/functions/v1/door-checkin';
  const KEY = location.hash.slice(1);
  const $ = (id) => document.getElementById(id);
  if (!/^[0-9a-f]{32}$/.test(KEY)) { $('locked').hidden = false; return; }
  $('door').hidden = false;

  async function api(action, extra) {
    const res = await fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: KEY, action, ...extra }) });
    if (res.status === 403) { $('door').hidden = true; $('locked').hidden = false; }
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  const euro = (cents) => `${(cents / 100).toFixed(0)} €`;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

  function paidButton(g, after) {
    const b = el('button', 'small', `${euro(g.due)} bezahlt · paid`);
    b.type = 'button';
    b.onclick = async () => {
      b.disabled = true;
      try { await api('paid', { id: g.id }); g.due = 0; after(); } catch { b.disabled = false; alert('Fehler · Error'); }
    };
    return b;
  }

  function showResult(r) {
    const box = $('result');
    const g = r.guest;
    const [cls, title] = r.result === 'valid' ? ['ok', 'Eingecheckt · Checked in']
      : r.result === 'already_used' ? ['warn', 'Schon eingecheckt · Already checked in']
      : r.result === 'wrong_event' ? ['bad', 'Falsches Event · Wrong event']
      : ['bad', `Ungültig · Invalid${r.code ? ` (${r.code})` : ''}`];
    box.replaceChildren();
    const msg = el('div', `msg ${cls}`, title);
    if (g) msg.append(el('small', '', `${g.name} · ${g.type}`));
    if (r.result === 'already_used' && r.at) msg.append(el('small', '', new Date(r.at).toLocaleTimeString('de-DE')));
    if (g && g.due > 0) {
      msg.append(el('small', '', `Noch zu zahlen · To pay: ${euro(g.due)}`));
      msg.append(paidButton(g, () => showResult(r)));
    }
    box.append(msg);
    box.hidden = false;
  }

  // Abendkasse: the 15 € door sale as its own total, apart from paid / to pay.
  async function doorSale() {
    try { const d = await api('doorsale', {}); $('abend').textContent = `Abendkasse: ${d.count} × 15 € = ${euro(d.cents)}`; } catch { /* keeps the last total */ }
  }
  doorSale();

  async function checkIn(by) {
    try { showResult(await api('scan', by)); } catch { showResult({ result: 'invalid', code: 'NETZ · NETWORK' }); }
    doorSale();
    if (q.value.trim().length >= 2) runSearch();
  }

  // Search list: name, type, state, and the buttons that still apply.
  const q = $('q');
  async function runSearch() {
    const list = $('list');
    if (q.value.trim().length < 2) { list.replaceChildren(); return; }
    let guests = [];
    try { ({ guests } = await api('search', { q: q.value })); } catch { return; }
    list.replaceChildren(...guests.map((g) => {
      const li = el('li');
      const info = el('div');
      const state = g.status === 'checked_in' ? 'eingecheckt · in' : g.status;
      info.append(el('b', '', g.name), el('small', '', `${g.type} · ${state}${g.due > 0 ? ` · ${euro(g.due)} offen` : ''}`));
      const acts = el('div', 'acts');
      if (g.status !== 'checked_in' && g.status !== 'cancelled') {
        const b = el('button', 'small', 'Check-in');
        b.type = 'button';
        b.onclick = () => { b.disabled = true; checkIn({ id: g.id }); };
        acts.append(b);
      }
      if (g.due > 0) acts.append(paidButton(g, runSearch));
      li.append(info, acts);
      return li;
    }));
  }
  let wait;
  q.addEventListener('input', () => { clearTimeout(wait); wait = setTimeout(runSearch, 300); });

  $('cam').onclick = async () => {
    try {
      await window.DoorScanner.start((token) => checkIn({ token }));
      $('cam').hidden = true; $('view').hidden = false;
    } catch { alert('Kamera nicht verfügbar · Camera not available'); }
  };
  $('stop').onclick = () => { window.DoorScanner.stop(); $('view').hidden = true; $('cam').hidden = false; };
})();
