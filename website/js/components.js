/* ============================================
   Slate Showcase — Component Showcase Logic
   ============================================ */

(function () {
  // Hover glow effect on component and principle cards
  const glowCards = document.querySelectorAll('.component-card, .principle-card');

  glowCards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--glow-x', `${x}px`);
      card.style.setProperty('--glow-y', `${y}px`);
      card.style.background = `radial-gradient(circle 200px at ${x}px ${y}px, rgba(99,102,241,0.06), rgba(10,10,26,0.5) 70%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.background = '';
    });
  });

  // SCF JSON preview that could be wired to live component loading
  // Placeholder for future: load actual component HTML from render/components/
  const componentData = {
    BrandIntro: {
      scf: `{
  "component": "BrandIntro",
  "props": {
    "logoSrc": "assets/logo.png",
    "companyName": "Contoso",
    "tagline": "Innovation at Scale"
  }
}`,
    },
    TerminalCast: {
      scf: `{
  "component": "TerminalCast",
  "props": {
    "shellTheme": "powershell",
    "stepsHtml": [
      "PS> slate render --scf comp.json",
      "Rendering 8 scenes...",
      "✓ Output: renders/final.mp4"
    ]
  }
}`,
    },
    VSCodeScene: {
      scf: `{
  "component": "VSCodeScene",
  "props": {
    "language": "python",
    "fileName": "tools/image_gen.py",
    "code": "class FoundryImageGen(BaseTool):\\n    name = 'foundry_image_gen'"
  }
}`,
    },
  };

  // Wire up click-to-show-SCF on component cards (future enhancement)
  // For now, the static grid showcases the components
})();
