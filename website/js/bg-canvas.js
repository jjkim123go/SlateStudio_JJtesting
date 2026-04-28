/* ============================================
   Slate Showcase — Persistent Background Shader
   Subtle animated noise field behind all sections
   ============================================ */

(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const VS = `attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

  const FS = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_scroll;

    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
    vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
    float snoise(vec2 v){
      const vec4 C=vec4(.211324865,.366025403,-.577350269,.024390243);
      vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
      vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
      vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
      vec3 p=permute(permute(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
      vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
      m=m*m;m=m*m;
      vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;
      vec3 ox=floor(x+.5);vec3 a0=x-ox;
      m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
      vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
      return 130.*dot(m,g);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = uv * 4.0;
      p.y += u_scroll * 0.5;

      float t = u_time * 0.15;
      float n1 = snoise(p + t);
      float n2 = snoise(p * 2.0 - t * 0.7);
      float n = n1 * 0.6 + n2 * 0.4;

      vec3 col1 = vec3(0.45, 0.1, 0.65) * 0.03;  // violet
      vec3 col2 = vec3(0.65, 0.33, 0.98) * 0.03; // purple

      vec3 color = mix(col1, col2, n * 0.5 + 0.5);
      color *= (0.3 + n * 0.3);

      // Very subtle — this is a background
      color *= 0.5;

      // Vignette
      float vig = 1.0 - smoothstep(0.3, 1.0, length(uv - 0.5) * 1.2);
      color *= vig;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function cs(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }
  const vs = cs(gl.VERTEX_SHADER, VS), fs = cs(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uScroll = gl.getUniformLocation(prog, 'u_scroll');

  let scrollY = 0;
  window.addEventListener('scroll', () => { scrollY = window.scrollY / window.innerHeight; });

  function resize() {
    canvas.width = Math.floor(canvas.clientWidth * 0.35);  // render at ~1/3 res
    canvas.height = Math.floor(canvas.clientHeight * 0.35);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  const t0 = performance.now();
  function render() {
    requestAnimationFrame(render);
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uScroll, scrollY);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render();
})();
