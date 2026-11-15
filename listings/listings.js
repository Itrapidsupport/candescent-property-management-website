(function () {
  'use strict';
  var FEED = 'https://app.doorloop.com/api/units/listings/mits/json/667f1a5d28d88c0445d30dd6/1?partnerKey=doorLoopListingSites&filter_listed=true&filter_showAllListedUnits=true';
  var FALLBACK = 'https://doorloop.com/tenant-portal/rental-applications/listing?companyId=667f1a5d28d88c0445d30dd6&source=CompanyLink';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var grid = document.getElementById('lgrid');
  if (!grid) return;
  var countEl = document.getElementById('lcount');
  var state = { beds: 0, max: 0, now: false, sort: 'avail' };
  var items = [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-CA'); }
  function d2(o) { return o && o._Year ? new Date(o._Year, o._Month - 1, o._Day) : null; }

  function parse(data) {
    var props = (data && data.PhysicalProperty && data.PhysicalProperty.Property) || [];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return props.map(function (p) {
      var pid = p.PropertyID || {}, ad = (pid.Address || [])[0] || {}, iu = p.ILS_Unit || {};
      var u = ((iu.Units || {}).Unit || [])[0] || {}, av = iu.Availability || {};
      var date = d2(av.MadeReadyDate) || d2(av.VacateDate);
      var now = !date || date <= today;
      var photos = (iu.File || []).filter(function (f) { return f.FileType === 'Photo' && f._Active !== false && f.Src; })
        .sort(function (a, b) { return (+a.Rank || 0) - (+b.Rank || 0); }).map(function (f) { return f.Src; });
      var sq = +u.MinSquareFeet || 0;
      var dep = (((iu.Deposit || {}).Amount || {}).ValueRange || {})._Exact;
      return {
        id: p._ListingID || pid.propertyId,
        street: ad.AddressLine1 || pid.MarketingName || 'Rental home',
        unit: ad.AddressLine2 || pid.unitName || '',
        city: [ad.City, ad.StateCode || ad.State].filter(Boolean).join(', ') + (ad.PostalCode ? ' ' + ad.PostalCode : ''),
        beds: +u.UnitBedrooms || 0, baths: +u.UnitBathrooms || 0, sqft: sq > 50 ? sq : 0,
        rent: +u.UnitRent || +u.MarketRent || 0, deposit: +dep || 0,
        desc: u.Description || '', now: now, date: date ? date.getTime() : 0,
        when: now ? 'Available now' : 'Available ' + MONTHS[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear(),
        apply: av.UnitAvailabilityURL || FALLBACK, photos: photos
      };
    }).filter(function (x) { return x.rent > 0; });
  }

  function facts(x) {
    var f = [];
    if (x.beds) f.push('<li><b>' + x.beds + '</b> bed' + (x.beds > 1 ? 's' : '') + '</li>');
    if (x.baths) f.push('<li><b>' + x.baths + '</b> bath' + (x.baths > 1 ? 's' : '') + '</li>');
    if (x.sqft) f.push('<li><b>' + x.sqft.toLocaleString('en-CA') + '</b> sq ft</li>');
    return '<ul class="lc-facts">' + f.join('') + '</ul>';
  }
  function title(x) { return esc(x.street) + (x.unit ? '<span>Unit ' + esc(x.unit) + '</span>' : ''); }

  function card(x, i) {
    var imgs = x.photos.map(function (src, k) {
      return '<img src="' + esc(src) + '" alt="' + esc(x.street + ' photo ' + (k + 1)) + '" width="1920" height="1080" loading="' + (i < 2 && k === 0 ? 'eager' : 'lazy') + '" draggable="false">';
    }).join('');
    return '<article class="lc" data-id="' + esc(x.id) + '">' +
      '<div class="lc-media">' +
        '<div class="lc-track" tabindex="0" aria-label="Photos of ' + esc(x.street) + '">' + (imgs || '<div class="lc-noimg">Photos coming soon</div>') + '</div>' +
        '<span class="lc-badge' + (x.now ? ' is-now' : '') + '">' + esc(x.when) + '</span>' +
        (x.photos.length ? '<button type="button" class="lc-count" data-open="' + esc(x.id) + '" aria-label="View all ' + x.photos.length + ' photos"><span class="lc-idx">1</span> / ' + x.photos.length + '</button>' : '') +
        (x.photos.length > 1 ? '<button type="button" class="lc-nav lc-prev" aria-label="Previous photo">&#8592;</button><button type="button" class="lc-nav lc-next" aria-label="Next photo">&#8594;</button>' : '') +
      '</div>' +
      '<div class="lc-body">' +
        '<p class="lc-rent">' + money(x.rent) + '<small>/month</small></p>' +
        '<h2 class="lc-title">' + title(x) + '</h2>' +
        '<p class="lc-city">' + esc(x.city) + '</p>' + facts(x) +
        '<div class="lc-cta"><a class="btn btn-solid" href="' + esc(x.apply) + '" target="_blank" rel="noopener">Apply now</a>' +
        '<button type="button" class="btn btn-ghost" data-open="' + esc(x.id) + '">View details</button></div>' +
      '</div></article>';
  }

  function render() {
    var list = items.filter(function (x) {
      return (!state.beds || x.beds >= state.beds) && (!state.max || x.rent <= state.max) && (!state.now || x.now);
    });
    list.sort(function (a, b) {
      if (state.sort === 'low') return a.rent - b.rent;
      if (state.sort === 'high') return b.rent - a.rent;
      return (a.now === b.now ? a.date - b.date : a.now ? -1 : 1);
    });
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? ' home' : ' homes') + (list.length === items.length ? ' available' : ' match');
    grid.innerHTML = list.length ? list.map(card).join('') :
      '<div class="lempty"><p class="kicker">No matches</p><h2>No homes match those filters right now.</h2><p>Try fewer filters, or check back soon. New homes appear here as soon as they are listed.</p><button type="button" class="btn btn-solid" id="lreset">Clear filters</button></div>';
    grid.setAttribute('aria-busy', 'false');
    wire();
  }

  function wire() {
    grid.querySelectorAll('.lc').forEach(function (c) {
      var tr = c.querySelector('.lc-track'), idx = c.querySelector('.lc-idx');
      if (!tr) return;
      var n = tr.querySelectorAll('img').length;
      var cur = function () { return Math.round(tr.scrollLeft / tr.clientWidth); };
      tr.addEventListener('scroll', function () { if (idx) idx.textContent = Math.min(n, cur() + 1); }, { passive: true });
      var go = function (d) { var t = (cur() + d + n) % n; tr.scrollTo({ left: t * tr.clientWidth, behavior: 'smooth' }); };
      var p = c.querySelector('.lc-prev'), nx = c.querySelector('.lc-next');
      if (p) p.addEventListener('click', function () { go(-1); });
      if (nx) nx.addEventListener('click', function () { go(1); });
      tr.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
      tr.addEventListener('click', function () { open(c.getAttribute('data-id'), cur()); });
    });
    grid.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); open(b.getAttribute('data-open'), 0); }); });
    var r = document.getElementById('lreset');
    if (r) r.addEventListener('click', reset);
  }

  // details + gallery dialog
  var dlg = document.getElementById('ldlg'), lastFocus = null;
  function open(id, start) {
    var x = items.filter(function (i) { return i.id === id; })[0];
    if (!x || !dlg) return;
    lastFocus = document.activeElement;
    var k = start || 0;
    dlg.innerHTML =
      '<div class="ld-in" role="document">' +
        '<button type="button" class="ld-close" aria-label="Close">&#10005;</button>' +
        '<div class="ld-stage">' + (x.photos.length ? '<img class="ld-img" alt="" src="' + esc(x.photos[k]) + '">' : '') +
          (x.photos.length > 1 ? '<button type="button" class="ld-nav ld-prev" aria-label="Previous photo">&#8592;</button><button type="button" class="ld-nav ld-next" aria-label="Next photo">&#8594;</button>' : '') +
          (x.photos.length ? '<span class="ld-idx">' + (k + 1) + ' / ' + x.photos.length + '</span>' : '') + '</div>' +
        (x.photos.length > 1 ? '<div class="ld-thumbs">' + x.photos.map(function (s, j) { return '<button type="button" data-k="' + j + '" aria-label="Photo ' + (j + 1) + '"' + (j === k ? ' aria-current="true"' : '') + '><img src="' + esc(s) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '') +
        '<div class="ld-info"><div>' +
          '<span class="lc-badge' + (x.now ? ' is-now' : '') + '">' + esc(x.when) + '</span>' +
          '<h2 class="lc-title" id="ld-title">' + title(x) + '</h2><p class="lc-city">' + esc(x.city) + '</p>' + facts(x) +
          (x.desc ? '<p class="ld-desc">' + esc(x.desc) + '</p>' : '') +
        '</div><aside class="ld-side"><p class="lc-rent">' + money(x.rent) + '<small>/month</small></p>' +
          (x.deposit ? '<p class="ld-dep">Security deposit ' + money(x.deposit) + '</p>' : '') +
          '<a class="btn btn-solid btn-lg" href="' + esc(x.apply) + '" target="_blank" rel="noopener">Apply now</a>' +
          '<a class="btn btn-ghost btn-lg" href="tel:+15874670570">Call (587) 467-0570</a></aside></div>' +
      '</div>';
    dlg.setAttribute('aria-labelledby', 'ld-title');
    var img = dlg.querySelector('.ld-img'), lab = dlg.querySelector('.ld-idx');
    function show(j) {
      k = (j + x.photos.length) % x.photos.length;
      img.src = x.photos[k]; if (lab) lab.textContent = (k + 1) + ' / ' + x.photos.length;
      dlg.querySelectorAll('.ld-thumbs button').forEach(function (b) { b.toggleAttribute('aria-current', +b.getAttribute('data-k') === k); });
    }
    dlg.querySelector('.ld-close').addEventListener('click', close);
    var pv = dlg.querySelector('.ld-prev'), nv = dlg.querySelector('.ld-next');
    if (pv) pv.addEventListener('click', function () { show(k - 1); });
    if (nv) nv.addEventListener('click', function () { show(k + 1); });
    dlg.querySelectorAll('.ld-thumbs button').forEach(function (b) { b.addEventListener('click', function () { show(+b.getAttribute('data-k')); }); });
    var sx = null, stage = dlg.querySelector('.ld-stage');
    stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) { if (sx == null || !x.photos.length) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(k + (dx < 0 ? 1 : -1)); sx = null; });
    dlg._key = function (e) { if (e.key === 'Escape') close(); if (x.photos.length > 1 && e.key === 'ArrowRight') show(k + 1); if (x.photos.length > 1 && e.key === 'ArrowLeft') show(k - 1); };
    document.addEventListener('keydown', dlg._key);
    dlg.hidden = false; document.documentElement.style.overflow = 'hidden';
    dlg.querySelector('.ld-close').focus();
  }
  function close() {
    dlg.hidden = true; dlg.innerHTML = ''; document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', dlg._key);
    if (lastFocus) lastFocus.focus();
  }
  if (dlg) dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

  // filters
  function setSeg(group, val) {
    document.querySelectorAll('[data-' + group + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-' + group) === String(val))); });
  }
  document.querySelectorAll('[data-beds]').forEach(function (b) { b.addEventListener('click', function () { state.beds = +b.getAttribute('data-beds'); setSeg('beds', state.beds); render(); }); });
  var mx = document.getElementById('lmax'), so = document.getElementById('lsort'), nw = document.getElementById('lnow');
  if (mx) mx.addEventListener('change', function () { state.max = +mx.value; render(); });
  if (so) so.addEventListener('change', function () { state.sort = so.value; render(); });
  if (nw) nw.addEventListener('click', function () { state.now = !state.now; nw.setAttribute('aria-pressed', String(state.now)); render(); });
  function reset() { state.beds = 0; state.max = 0; state.now = false; setSeg('beds', 0); if (mx) mx.value = '0'; if (nw) nw.setAttribute('aria-pressed', 'false'); render(); }

  // load: snapshot first (instant), then live feed
  function boot(data, live) {
    var parsed = parse(data);
    if (parsed.length || live) { items = parsed; render(); }
    document.documentElement.classList.toggle('feed-live', !!live);
  }
  try { var snap = document.getElementById('lsnap'); if (snap) boot(JSON.parse(snap.textContent), false); } catch (e) {}
  fetch(FEED, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { boot(d, true); })
    .catch(function () { if (!items.length) grid.innerHTML = '<div class="lempty"><p class="kicker">Listings</p><h2>We could not load listings just now.</h2><p>Please try again in a moment, or view them on our secure DoorLoop page.</p><a class="btn btn-solid" href="' + FALLBACK + '" target="_blank" rel="noopener">View all listings</a></div>'; });
})();
