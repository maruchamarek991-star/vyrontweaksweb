/* Runs in <head>: applies saved theme and skips the intro after the first visit in a session. */
(function () {
  try {
    var th = localStorage.getItem('vy-theme');
    document.documentElement.setAttribute('data-theme', th === 'light' ? 'light' : 'dark');
  } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }
  try { if (sessionStorage.getItem('vy-intro')) document.documentElement.classList.add('seen'); } catch (e) {}
  try { var d = sessionStorage.getItem('vy-dir'); if (d) { document.documentElement.classList.add('from-' + d); sessionStorage.removeItem('vy-dir'); } } catch (e) {}
})();

/* Protection: no selection / copy / right-click / devtools shortcuts, devtools detection. */
(function () {
  var d = document;
  function stop(e) { e.preventDefault(); return false; }
  ['contextmenu', 'selectstart', 'dragstart', 'copy', 'cut'].forEach(function (t) { d.addEventListener(t, stop, true); });
  d.addEventListener('mousedown', function (e) { if (e.button === 0 && e.detail > 1) e.preventDefault(); }, true);
  d.addEventListener('keydown', function (e) {
    var c = e.ctrlKey || e.metaKey, k = e.code;
    if (e.keyCode === 123 || k === 'F12' ||
        (c && e.shiftKey && (k === 'KeyI' || k === 'KeyJ' || k === 'KeyC' || k === 'KeyK')) ||
        (c && e.altKey && (k === 'KeyI' || k === 'KeyJ' || k === 'KeyC' || k === 'KeyU')) ||
        (c && (k === 'KeyU' || k === 'KeyS' || k === 'KeyA'))) stop(e);
  }, true);
  /* DevTools open (opened from the browser menu too) => the `debugger` statement pauses the page, so the time between
     the two reads jumps. Then the page content is wiped; when DevTools is closed again the page reloads itself. */
  var shut = false;
  function lock() {
    if (shut) return; shut = true;
    d.documentElement.classList.add('dt-open');
    try { if (d.body) d.body.innerHTML = ''; d.head.querySelectorAll('style,link[rel=stylesheet]').forEach(function (n) { n.disabled = true; }); } catch (e) {}
  }
  function check() {
    var t = performance.now();
    debugger;
    if (performance.now() - t > 120) lock();
    else if (shut) location.reload();
  }
  setInterval(check, 400);
  check();
})();

try { var pn = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, ''); if (pn === '' || pn === '/') document.documentElement.classList.add('on-home'); } catch (e) {}
