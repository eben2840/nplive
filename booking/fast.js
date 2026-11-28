// Tonight only (Session 004, until 23:00): booking without the 6-digit email code, through the
// web-book function. Runs before book.js's own form handler; after 23:00 it steps aside.
(function () {
  var EVENT = '12f16300-7b36-47e1-878e-22e139032932';
  var CLOSES = Date.parse('2026-11-28T22:00:00Z');
  var NP = window.NP;
  if (!NP || NP.eventId !== EVENT || Date.now() > CLOSES) return;
  var $ = NP.$;
  var val = function (id) { return $(id) ? $(id).value.trim() : ''; };
  var ERRORS = {
    ALREADY_BOOKED: 'You already have a ticket for this event.',
    CAPACITY_EXCEEDED: 'Sorry, this ticket is sold out.',
    EVENT_NOT_BOOKABLE: 'Booking is closed for this event.',
    SALES_CLOSED: 'Sales for this ticket have ended.',
    ACCESS_CODE_INVALID: 'Wrong access code.',
    INVALID: 'Please enter your first name, last name and a valid email.'
  };

  document.addEventListener('submit', async function (e) {
    if (e.target.id !== 'wb-form') return;
    e.preventDefault(); e.stopImmediatePropagation();
    var button = e.submitter; button.disabled = true; $('wb-err').textContent = '';
    var type = document.querySelector('input[name="wb-type"]:checked');
    try {
      var booking = await NP.api('/functions/v1/web-book', {
        type_id: type ? type.value : '', first: val('wb-first'), last: val('wb-last'), email: val('wb-email'),
        access_code: type && type.dataset.private ? val('wb-access') : null
      });
      $('wb-form').hidden = true;
      $('wb-done').hidden = false;
      $('wb-done').textContent = 'You are booked! Booking ' + booking.booking_number +
        '. Your ticket is on its way to your email.';
    } catch (error) {
      var code = Object.keys(ERRORS).find(function (k) { return error.message.indexOf(k) >= 0; });
      $('wb-err').textContent = code ? ERRORS[code] : 'Something went wrong. Please try again.';
      button.disabled = false;
    }
  }, true);
})();
