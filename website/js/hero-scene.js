/* ============================================
   Slate Showcase — Deep Purple Luminescence Shader
   Glowing energy tendrils + bright core + particle trails
   ============================================ */

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const VS = `attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

  const FS = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;

    #define PI 3.14159265359
    #define TAU 6.28318530718

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
      }
      return v;
    }

    // Single tendril — reduced to 16 samples
    float tendril(vec2 uv, float seed, float time) {
      float t = time * (0.3 + seed * 0.2);
      float segments = 0.0;
      for (float i = 0.0; i < 16.0; i++) {
        float s = i / 16.0;
        float angle = seed * TAU + s * (3.0 + sin(seed * 5.0)) + t;
        float r = s * (1.2 + 0.4 * sin(t + seed * 3.0));
        float wobX = sin(s * 8.0 + t * 2.0 + seed * 10.0) * 0.08 * s;
        float wobY = cos(s * 6.0 + t * 1.5 + seed * 7.0) * 0.06 * s;
        vec2 pos = vec2(cos(angle) * r + wobX, sin(angle) * r + wobY);
        float d = length(uv - pos);
        float width = 0.004 + 0.015 * (1.0 - s);
        float glow = width / (d + 0.001);
        glow *= (1.0 - s * 0.7) * smoothstep(0.0, 0.1, s);
        segments += glow;
      }
      return segments;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
      vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
      float t = u_time;

      uv.x -= 0.35;
      uv += u_mouse * 0.08;

      float radius = length(uv);
      float angle = atan(uv.y, uv.x);

      // 8 tendrils (was 14)
      float tendrils = 0.0;
      for (float i = 0.0; i < 8.0; i++) {
        tendrils += tendril(uv, i / 8.0, t) * 0.18;
      }
      tendrils = min(tendrils, 3.0);

      // Core + rays (6 rays, was 12)
      float core = 0.04 / (radius + 0.02);
      core *= 1.0 + 0.4 * sin(t * 2.5);

      float rays = 0.0;
      for (float i = 0.0; i < 6.0; i++) {
        float ra = TAU * i / 6.0 + t * 0.15 + sin(t * 0.3 + i) * 0.3;
        float diff = abs(mod(angle - ra + PI, TAU) - PI);
        rays += smoothstep(0.08, 0.0, diff) * smoothstep(2.0, 0.0, radius) * smoothstep(0.0, 0.15, radius) * 0.12;
      }

      float bloom = exp(-radius * 3.0) * 0.8 * (1.0 + 0.3 * sin(t * 3.0));

      // Nebula (3 octave fbm)
      float n1 = fbm(uv * 1.5 + t * 0.15);
      float nebula = n1 * 0.5 + fbm(uv * 2.5 - t * 0.1 + n1 * 0.5) * 0.3;

      // 15 sparkles (was 40)
      float sparkles = 0.0;
      for (float i = 0.0; i < 15.0; i++) {
        vec2 sp = vec2(hash(i * 1.17) * 3.0 - 1.5 + sin(t * 0.2 + i) * 0.2,
                       hash(i * 2.31) * 3.0 - 1.5 + cos(t * 0.15 + i * 1.3) * 0.2);
        float blink = 0.5 + 0.5 * sin(t * (1.0 + hash(i * 3.7)) + i * 5.0);
        sparkles += smoothstep(0.015, 0.0, length(uv - sp)) * blink * 0.4;
      }

      // --- Color composition (purple) ---
      vec3 deepPurple = vec3(0.15, 0.02, 0.25);
      vec3 violet = vec3(0.45, 0.1, 0.65);
      vec3 magenta = vec3(0.7, 0.15, 0.75);
      vec3 lavender = vec3(0.75, 0.55, 0.95);
      vec3 white = vec3(1.0, 0.9, 1.0);

      vec3 color = vec3(0.0);
      vec3 tc = mix(magenta, lavender, smoothstep(0.0, 1.5, tendrils));
      tc = mix(tc, white, smoothstep(1.0, 2.5, tendrils));
      color += tc * tendrils * 0.5;
      color += mix(lavender, white, smoothstep(0.5, 3.0, core)) * core * 0.4;
      color += mix(violet, lavender, 0.5) * rays;
      color += mix(violet, magenta, 0.4) * bloom;
      color += mix(deepPurple, violet, nebula * 0.5 + 0.5) * (0.15 + nebula * 0.2) * smoothstep(2.0, 0.0, radius);
      color += mix(lavender, white, 0.7) * sparkles;

      // Post
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      color += color * smoothstep(0.4, 1.5, lum) * 0.6;
      color = max(color, deepPurple * 0.3 + violet * 0.05 * (0.5 + 0.5 * sin(screenUV.y * 3.0 + t * 0.1)));

      float vigL = smoothstep(-0.1, 0.8, screenUV.x);
      float vigE = 1.0 - smoothstep(0.5, 1.3, length((screenUV - 0.5) * vec2(1.5, 2.0)));
      color *= mix(0.3, 1.0, vigL) * mix(0.4, 1.0, vigE);

      color += (hash(gl_FragCoord.xy + vec2(t * 100.0, 0.0)) - 0.5) * 0.02;
      color = color / (color + vec3(0.8));
      color = pow(color, vec3(0.85));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // ---- Compile & link ----
  function cs(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader:', gl.getShaderInfoLog(s));
      gl.deleteShader(s); return null;
    }
    return s;
  }

  const vs = cs(gl.VERTEX_SHADER, VS), fs = cs(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program:', gl.getProgramInfoLog(prog)); return;
  }
  gl.useProgram(prog);

  // Fullscreen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * -2;
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.0); // render at 1x for performance
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // Scroll fade
  let scrollFade = 1.0;
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '#hero', start: 'top top', end: 'bottom top',
      onUpdate: s => { scrollFade = 1.0 - s.progress; },
    });
  }

  const t0 = performance.now();
  function render() {
    requestAnimationFrame(render);
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mx, my);
    canvas.style.opacity = Math.max(0, scrollFade);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render();
})();
