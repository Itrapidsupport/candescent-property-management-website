(function () {
  var b = document.querySelector('.hdr-burger'), m = document.getElementById('mnav');
  if (!b || !m) return;
  b.addEventListener('click', function () {
    var open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!open));
    b.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    if (open) { m.hidden = true; document.documentElement.style.overflow = ''; }
    else { m.hidden = false; document.documentElement.style.overflow = 'hidden'; }
  });
})();
