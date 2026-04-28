/* ============================================
   Slate Showcase — Magnetic Cursor
   ============================================ */

(function () {
  // Skip on touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  if (!cursor || !follower) return;

  let cursorX = 0, cursorY = 0;
  let followerX = 0, followerY = 0;
  let clientX = -100, clientY = -100;

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    clientX = e.clientX;
    clientY = e.clientY;
  });

  // Animation loop
  function render() {
    // Smooth follow
    cursorX += (clientX - cursorX) * 0.2;
    cursorY += (clientY - cursorY) * 0.2;
    followerX += (clientX - followerX) * 0.08;
    followerY += (clientY - followerY) * 0.08;

    cursor.style.transform = `translate(${cursorX - 6}px, ${cursorY - 6}px)`;
    follower.style.transform = `translate(${followerX - 20}px, ${followerY - 20}px)`;

    requestAnimationFrame(render);
  }
  render();

  // Magnetic effect on [data-magnetic] elements
  const magneticEls = document.querySelectorAll('[data-magnetic]');

  magneticEls.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-active');
      follower.classList.add('is-active');
    });

    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-active');
      follower.classList.remove('is-active');

      // Reset element position
      if (typeof gsap !== 'undefined') {
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      }
    });

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * 0.2;
      const deltaY = (e.clientY - centerY) * 0.2;

      if (typeof gsap !== 'undefined') {
        gsap.to(el, { x: deltaX, y: deltaY, duration: 0.3, ease: 'power2.out' });
      }
    });
  });

  // Scale cursor on clickable elements
  const clickables = document.querySelectorAll('a, button, .principle-card, .component-card, .pipeline-card');

  clickables.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-active');
      follower.classList.add('is-active');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-active');
      follower.classList.remove('is-active');
    });
  });

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    follower.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
    follower.style.opacity = '1';
  });
})();
