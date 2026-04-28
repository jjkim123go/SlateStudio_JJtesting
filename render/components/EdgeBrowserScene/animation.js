// EdgeBrowserScene — animation stub (Wave A, PR 10c)
// The chrome shell is static for fidelity work.
// This stub wires up minimal tab-switch CSS if multiple tabs are present.

(function initEdgeBrowserScene() {
  var prefix = '.scene-' + SCENE_ID;
  var tabs = document.querySelectorAll(prefix + ' .edge-tab');

  // Window fade-in
  master.fromTo(prefix + ' .edge-window',
    { opacity: 0, y: 12, scale: 0.99 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' },
    SCENE_START + 0.1);

  // If multiple tabs, clicking one activates it (CSS class swap)
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('edge-tab--active'); });
      tab.classList.add('edge-tab--active');
    });
  });

  // Fade-out at scene end
  master.to(prefix + ' .edge-window',
    { opacity: 0, duration: 0.45, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.45);
})();
