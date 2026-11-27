// Motion for the landing page: sections rise in as they scroll into view, the numbers count
// up, and the top bar turns solid once the page moves. Without this file the page still reads.
(function () {
  document.documentElement.classList.add('js');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches; // no counting then

  function countUp(node) {
    var target = Number(node.dataset.count), plus = node.dataset.plain ? '' : '+', start = null;
    function frame(now) {
      if (start === null) start = now;
      var done = Math.min((now - start) / 1400, 1);
      node.textContent = Math.round(target * (1 - Math.pow(1 - done, 3))) + (done === 1 ? plus : '');
      if (done < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        if (entry.target.dataset.count && !still) countUp(entry.target);
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    // Neighbours rise one after another instead of all at once.
    document.querySelectorAll('.reveal').forEach(function (node, index) {
      node.style.setProperty('--d', (index % 3) * 0.12 + 's');
      seen.observe(node);
    });
    document.querySelectorAll('[data-count]').forEach(function (node) { seen.observe(node); });
    var bar = document.querySelector('.bar');
    addEventListener('scroll', function () { bar.classList.toggle('stuck', scrollY > 30); }, { passive: true });
  });
})();
