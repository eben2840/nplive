// Booking flow on every device: reserve a free / pay-at-door ticket for ?id= with the app's
// fn_create_booking after a 6-digit email code. event.js draws the event and its ticket rows.
// Plain fetch to Supabase, no library or CDN; token kept in memory only, logged out after
// booking; all text set with textContent, never as HTML.
(function () {
  if (window.top !== window.self) { document.body.hidden = true; return; } // refuse to be framed
  var $ = function (id) { return document.getElementById(id); };

  var BASE = 'https://dcnnaoygtxswlhctyktc.supabase.co';
  var KEY = 'sb_publishable_T-0xOKcMcfv7LaElPlf_MQ__IUyoF64'; // public key, same as in the app; the database rules protect the data
  var ERRORS = {
    ALREADY_BOOKED: 'You already have a ticket for this event.',
    CAPACITY_EXCEEDED: 'Sorry, this ticket is sold out.',
    EVENT_NOT_BOOKABLE: 'Booking is closed for this event.',
    DEADLINE_PASSED: 'Booking is closed for this event.',
    SALES_CLOSED: 'Sales for this ticket have ended.'
  };
  var eventId = new URLSearchParams(location.search).get('id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) return;
  var val = function (id) { return $(id).value.trim(); };

  async function api(path, body, token) {
    var headers = { apikey: KEY, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    var res = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: headers,
      body: body ? JSON.stringify(body) : undefined });
    var data = await res.json().catch(function () { return null; });
    if (!res.ok) throw new Error((data && (data.message || data.msg)) || String(res.status));
    return data;
  }

  function fail(message, button) {
    $('wb-err').textContent = message; if (button) button.disabled = false;
  }

  function messageOf(error) {
    var code = Object.keys(ERRORS).find(function (k) { return error.message.indexOf(k) >= 0; });
    return code ? ERRORS[code] : 'Something went wrong. Please try again.';
  }

  $('wb-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var button = e.submitter; button.disabled = true; fail('');
    try {
      await api('/auth/v1/otp', { email: val('wb-email'), create_user: true,
        data: { first_name: val('wb-first'), last_name: val('wb-last') } });
    } catch (_) { return fail('Could not send the code. Wait a minute and try again.', button); }
    $('wb-sent').textContent = 'Enter the 6-digit code we sent to ' + val('wb-email') + '.';
    $('wb-form').hidden = true;
    $('wb-code').hidden = false; $('wb-otp').focus();
  });

  $('wb-code').addEventListener('submit', async function (e) {
    e.preventDefault();
    var button = e.submitter; button.disabled = true; fail('');
    var token;
    try {
      token = (await api('/auth/v1/verify', { type: 'email', email: val('wb-email'), token: val('wb-otp') })).access_token;
    } catch (_) { return fail('Wrong or expired code.', button); }
    try {
      var booking = await api('/rest/v1/rpc/fn_create_booking', {
        p_event_id: eventId, p_ticket_type_id: document.querySelector('input[name="wb-type"]:checked').value, p_quantity: 1,
        p_first_name: val('wb-first'), p_last_name: val('wb-last'),
        p_attendees: [{ first_name: val('wb-first'), last_name: val('wb-last') }], p_marketing_opt_in: false
      }, token);
      $('wb-code').hidden = true;
      $('wb-done').hidden = false;
      $('wb-done').textContent = 'You are booked! Booking ' + booking.booking_number +
        '. Your ticket is on its way to your email.';
    } catch (error) { fail(messageOf(error), button); }
    finally { api('/auth/v1/logout', {}, token).catch(function () {}); token = null; }
  });

  window.NP = { $: $, api: api, eventId: eventId }; // for event.js
})();
