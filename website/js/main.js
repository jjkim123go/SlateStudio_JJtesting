/* ============================================
   Slate Showcase — Main Orchestration
   GSAP + Lenis + ScrollTrigger
   ============================================ */

// ---- Lenis Smooth Scroll ----
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smooth: true,
  smoothTouch: false,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Sync Lenis with GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ---- Navbar scroll effect ----
ScrollTrigger.create({
  start: 'top -80',
  onUpdate: (self) => {
    const nav = document.getElementById('navbar');
    if (self.direction === 1 && self.scroll() > 80) {
      nav.classList.add('scrolled');
    }
    if (self.scroll() < 80) {
      nav.classList.remove('scrolled');
    }
  },
});

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      lenis.scrollTo(target, { offset: -80 });
    }
  });
});

// ---- Hero Entrance ----
const heroTl = gsap.timeline({ delay: 0.3 });

heroTl
  .to('.hero-badge', {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power3.out',
  })
  .to(
    '.hero-title',
    {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
    },
    '-=0.5'
  )
  .to(
    '.hero-subtitle',
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
    },
    '-=0.6'
  )
  .to(
    '.hero-ctas',
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
    },
    '-=0.5'
  )
  .to(
    '.hero-stats',
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
    },
    '-=0.4'
  );

// ---- Counter animation ----
document.querySelectorAll('.counter').forEach((counter) => {
  const target = parseInt(counter.dataset.target);
  if (!target) return;

  ScrollTrigger.create({
    trigger: counter,
    start: 'top 90%',
    once: true,
    onEnter: () => {
      gsap.to(counter, {
        innerText: target,
        duration: 2,
        ease: 'power2.out',
        snap: { innerText: 1 },
        onUpdate: function () {
          counter.textContent = Math.round(
            gsap.getProperty(counter, 'innerText')
          );
        },
      });
    },
  });
});

// ---- Section headers entrance ----
document.querySelectorAll('section:not(#hero)').forEach((section) => {
  const labels = section.querySelectorAll('.section-label');
  const titles = section.querySelectorAll('.section-title');
  const subtitles = section.querySelectorAll('.section-subtitle');

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 75%',
      once: true,
    },
  });

  if (labels.length) tl.to(labels, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
  if (titles.length) tl.to(titles, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.3');
  if (subtitles.length) tl.to(subtitles, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.4');
});

// ---- Pipeline horizontal scroll ----
const pipelineSection = document.getElementById('pipeline');
const pipelineTrack = document.querySelector('.pipeline-track');

if (pipelineSection && pipelineTrack) {
  // Animate cards in
  gsap.to('.pipeline-card', {
    opacity: 1,
    y: 0,
    duration: 0.6,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: pipelineSection,
      start: 'top 70%',
      once: true,
    },
  });

  gsap.to('.pipeline-connector', {
    opacity: 1,
    duration: 0.4,
    stagger: 0.1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: pipelineSection,
      start: 'top 70%',
      once: true,
    },
  });

  // Horizontal scroll
  const getScrollAmount = () => {
    return -(pipelineTrack.scrollWidth - window.innerWidth);
  };

  gsap.to(pipelineTrack, {
    x: getScrollAmount,
    ease: 'none',
    scrollTrigger: {
      trigger: pipelineSection,
      start: 'top top',
      end: () => `+=${pipelineTrack.scrollWidth - window.innerWidth}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });
}

// ---- Principles entrance ----
gsap.to('.principle-card', {
  opacity: 1,
  y: 0,
  duration: 0.5,
  stagger: 0.06,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '#principles .grid',
    start: 'top 80%',
    once: true,
  },
});

// ---- Use case carousel (draggable) ----
const usecaseTrack = document.querySelector('.usecase-track');

if (usecaseTrack) {
  gsap.to('.usecase-card', {
    opacity: 1,
    y: 0,
    duration: 0.6,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#use-cases',
      start: 'top 70%',
      once: true,
    },
  });

  // Simple drag scroll
  let isDragging = false;
  let startX;
  let scrollLeft;

  usecaseTrack.addEventListener('mousedown', (e) => {
    isDragging = true;
    usecaseTrack.style.cursor = 'grabbing';
    startX = e.pageX - usecaseTrack.offsetLeft;
    scrollLeft = usecaseTrack.parentElement.scrollLeft;
  });

  usecaseTrack.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - usecaseTrack.offsetLeft;
    const walk = (x - startX) * 2;
    // Use transform for smooth dragging
    const currentTransform = gsap.getProperty(usecaseTrack, 'x') || 0;
    const maxScroll = -(usecaseTrack.scrollWidth - usecaseTrack.parentElement.clientWidth);
    const newX = Math.max(maxScroll, Math.min(0, currentTransform + (e.movementX * 2)));
    gsap.set(usecaseTrack, { x: newX });
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    if (usecaseTrack) usecaseTrack.style.cursor = 'grab';
  });
}

// ---- Video demo section ----
gsap.to('.video-container', {
  opacity: 1,
  scale: 1,
  duration: 1,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '#demo',
    start: 'top 70%',
    once: true,
  },
});

// Check if video src is available
const demoVideo = document.getElementById('demo-video');
const placeholder = document.getElementById('video-placeholder');
if (demoVideo && demoVideo.dataset.src) {
  demoVideo.src = demoVideo.dataset.src;
  demoVideo.classList.remove('hidden');
  if (placeholder) placeholder.classList.add('hidden');
}

// ---- Component cards ----
gsap.to('.component-card', {
  opacity: 1,
  y: 0,
  duration: 0.5,
  stagger: 0.08,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '#components .grid',
    start: 'top 80%',
    once: true,
  },
});

// ---- Architecture layers ----
gsap.to('.arch-layer', {
  opacity: 1,
  x: 0,
  duration: 0.6,
  stagger: 0.1,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '#architecture',
    start: 'top 70%',
    once: true,
  },
});

// ---- CTA section ----
gsap.to('.cta-title', {
  opacity: 1,
  y: 0,
  duration: 1,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '#cta',
    start: 'top 75%',
    once: true,
  },
});

// ---- Typing animation in CTA ----
const typingTexts = [
  '"Turn this Sprint 14 review deck into a 90-second video with Teams and Azure Portal walkthroughs."',
  '"Here\'s our architecture doc — build a 2-minute explainer without recording a single screen."',
  '"Take this keynote footage, trim to the AI segment, add brand intro/outro, produce 5 audience versions."',
  '"Use these product screenshots and this PowerPoint — make a Copilot adoption video for Fabrikam."',
  '"Convert this MS Learn page into a 3-minute training module with Entra admin center UI and Japanese narration."',
];

const typingEl = document.querySelector('.typing-text');
let textIndex = 0;

function typeText(text, el, callback) {
  let i = 0;
  el.textContent = '';
  const interval = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(interval);
      setTimeout(callback, 2500);
    }
  }, 35);
}

function deleteText(el, callback) {
  const text = el.textContent;
  let i = text.length;
  const interval = setInterval(() => {
    el.textContent = text.substring(0, i);
    i--;
    if (i < 0) {
      clearInterval(interval);
      setTimeout(callback, 300);
    }
  }, 20);
}

function runTypingLoop() {
  if (!typingEl) return;
  typeText(typingTexts[textIndex], typingEl, () => {
    deleteText(typingEl, () => {
      textIndex = (textIndex + 1) % typingTexts.length;
      runTypingLoop();
    });
  });
}

// Start typing when CTA is visible
ScrollTrigger.create({
  trigger: '#cta',
  start: 'top 80%',
  once: true,
  onEnter: () => {
    setTimeout(runTypingLoop, 500);
  },
});

// ---- Parallax on hero content ----
gsap.to('#hero .hero-text-block', {
  yPercent: 15,
  ease: 'none',
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
  },
});

// Fade hero background on scroll
gsap.to('.hero-bg', {
  opacity: 0,
  ease: 'none',
  scrollTrigger: {
    trigger: '#hero',
    start: 'center center',
    end: 'bottom top',
    scrub: 1,
  },
});

// ---- Model cards hover glow ----
document.querySelectorAll('#architecture .grid > div').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(99,102,241,0.08), rgba(10,10,26,0.3))`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.background = '';
  });
});

console.log('Slate showcase loaded.');
