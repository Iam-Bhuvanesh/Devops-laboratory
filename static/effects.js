/**
 * WebGL2 & Physics Interactive Effects:
 * 1. SpecularButton (WebGL2 Edge-Lit Button)
 * 2. MagicRings (WebGL2 Pulsing Concentric Rings)
 * 3. RubberSegment (Elastic Spring-Physics Segmented Control)
 * 4. MagicBento (3D Tilt, Border Glow, Spotlight & Interactive Visuals)
 */

// ==========================================
// 1. SPECULAR BUTTON (WebGL2 Edge-Lit Button)
// ==========================================
const SpecularButtonModule = (() => {
  const PAD = 24;
  const VERTEX = `#version 300 es
  in vec2 aPosition;
  void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

  const FRAGMENT = `#version 300 es
  precision highp float;
  uniform vec2 uCenter; uniform vec2 uHalf; uniform float uRadius; uniform float uPx;
  uniform float uSpot; uniform vec2 uEntry; uniform vec3 uLineColor; uniform vec3 uBaseColor;
  uniform float uIntensity; uniform vec2 uWindow; uniform float uThickness; uniform float uGlow;
  out vec4 outColor;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float loopPosition(vec2 p, vec2 b, float r) {
    vec2 inner = b - r;
    float arc = 1.5707963 * r;
    float quarter = inner.x + inner.y + arc;
    vec2 a = abs(p); vec2 q = a - inner;
    float s = q.x > 0.0 && q.y > 0.0 ? inner.y + atan(q.y, q.x) * r : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
    if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
    else if (p.y < 0.0) s = 4.0 * quarter - s;
    return s / max(4.0 * quarter, 0.0001);
  }
  float lobe(float position, float center) {
    float gap = abs(fract(position - center + 0.5) - 0.5);
    return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap);
  }
  void main() {
    vec2 p = gl_FragCoord.xy - uCenter;
    float d = roundedBox(p, uHalf, uRadius);
    float position = loopPosition(p, uHalf, uRadius);
    float key = lobe(position, uSpot);
    float back = lobe(position, uSpot + 0.5);
    float streak = key + back * 0.45;
    float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
    float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
    float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
    float inside = 1.0 - smoothstep(-0.6, 0.6, d);
    vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
    float glow = streak * 0.2 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.08 * exp(-dot(pool, pool));
    float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
    vec4 base = vec4(uBaseColor, 1.0) * hair * 0.6;
    outColor = vec4(uLineColor, 1.0) * light + base * (1.0 - light);
  }`;

  const UNIFORMS = ['uCenter', 'uHalf', 'uRadius', 'uPx', 'uSpot', 'uEntry', 'uLineColor', 'uBaseColor', 'uIntensity', 'uWindow', 'uThickness', 'uGlow'];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const wrap = (v) => v - Math.floor(v);

  const loopPos = (x, y, halfX, halfY, r) => {
    const innerX = halfX - r, innerY = halfY - r, arc = (Math.PI / 2) * r, quarter = innerX + innerY + arc;
    const ax = Math.abs(x), ay = Math.abs(y), qx = ax - innerX, qy = ay - innerY;
    let s;
    if (qx > 0 && qy > 0) s = innerY + Math.atan2(qy, qx) * r;
    else if (qx > qy) s = Math.min(ay, innerY);
    else s = innerY + arc + innerX - Math.min(ax, innerX);
    if (x < 0) s = y >= 0 ? 2 * quarter - s : 2 * quarter + s;
    else if (y < 0) s = 4 * quarter - s;
    return wrap(s / Math.max(4 * quarter, 0.0001));
  };

  const rimPoint = (position, halfX, halfY, r) => {
    const innerX = halfX - r, innerY = halfY - r, arc = (Math.PI / 2) * r, quarter = innerX + innerY + arc;
    let s = wrap(position) * 4 * quarter, signX = 1, signY = 1;
    if (s > 3 * quarter) { s = 4 * quarter - s; signY = -1; }
    else if (s > 2 * quarter) { s -= 2 * quarter; signX = -1; signY = -1; }
    else if (s > quarter) { s = 2 * quarter - s; signX = -1; }
    let x = innerX - (s - innerY - arc), y = halfY;
    if (s <= innerY) { x = halfX; y = s; }
    else if (s <= innerY + arc) {
      const angle = (s - innerY) / Math.max(r, 0.0001);
      x = innerX + Math.cos(angle) * r; y = innerY + Math.sin(angle) * r;
    }
    return [x * signX, y * signY];
  };

  const parseHex = (hex) => {
    if (!hex) return [1, 1, 1];
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
  };

  function init(button) {
    if (!button) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'specular-button__light';
    canvas.setAttribute('aria-hidden', 'true');
    button.prepend(canvas);

    const gl = canvas.getContext('webgl2', { alpha: true, depth: false });
    if (!gl) return;

    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, VERTEX); gl.compileShader(vertShader);
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, FRAGMENT); gl.compileShader(fragShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertShader); gl.attachShader(program, fragShader); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const uniforms = {};
    for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const settings = {
      radius: parseFloat(button.dataset.radius || 18),
      lineColor: parseHex(button.dataset.lineColor || '#0969da'),
      baseColor: parseHex(button.dataset.baseColor || '#d0d7de'),
      intensity: parseFloat(button.dataset.intensity || 1.2),
      idleIntensity: parseFloat(button.dataset.idleIntensity || 0.4),
      shineSize: parseFloat(button.dataset.shineSize || 10),
      shineFade: parseFloat(button.dataset.shineFade || 34),
      thickness: parseFloat(button.dataset.thickness || 1.2),
      glow: parseFloat(button.dataset.glow || 1),
      proximity: parseFloat(button.dataset.proximity || 250)
    };

    const view = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0, y: 0, known: false };
    const state = { spot: 0, level: 0, press: 0, ready: false };
    let last = 0;

    const cornerRadius = () => Math.min(settings.radius, view.width / 2, view.height / 2);
    const restSpot = () => {
      const r = cornerRadius();
      return loopPos(r * (1 - Math.SQRT1_2) - view.width / 2, view.height / 2 - r * (1 - Math.SQRT1_2), view.width / 2, view.height / 2, r);
    };

    const aim = () => {
      if (!pointer.known) return null;
      const rect = button.getBoundingClientRect();
      const scale = rect.width / view.width || 1;
      const halfX = view.width / 2, halfY = view.height / 2;
      const x = (pointer.x - rect.left - rect.width / 2) / scale;
      const y = (rect.top + rect.height / 2 - pointer.y) / scale;
      const dist = Math.hypot(Math.max(Math.abs(x) - halfX, 0), Math.max(Math.abs(y) - halfY, 0));
      const t = clamp(1 - dist / settings.proximity, 0, 1);
      const nearest = loopPos(x, y, halfX, halfY, cornerRadius());
      return { spot: nearest, near: t * t * (3 - 2 * t) };
    };

    const draw = () => {
      const { width, height } = view;
      const scaleX = canvas.width / (width + PAD * 2), scaleY = canvas.height / (height + PAD * 2);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uCenter, (PAD + width / 2) * scaleX, (PAD + height / 2) * scaleY);
      gl.uniform2f(uniforms.uHalf, (width / 2) * scaleX, (height / 2) * scaleY);
      gl.uniform1f(uniforms.uRadius, Math.min(settings.radius, width / 2, height / 2) * scaleX);
      gl.uniform1f(uniforms.uPx, view.ratio);
      const r = Math.min(settings.radius, width / 2, height / 2);
      const [rimX, rimY] = rimPoint(state.spot, width / 2, height / 2, r);
      gl.uniform1f(uniforms.uSpot, state.spot);
      gl.uniform2f(uniforms.uEntry, rimX * scaleX, rimY * scaleY);
      gl.uniform3fv(uniforms.uLineColor, settings.lineColor);
      gl.uniform3fv(uniforms.uBaseColor, settings.baseColor);
      gl.uniform1f(uniforms.uIntensity, settings.intensity * (state.level + state.press * 0.8));
      gl.uniform2f(uniforms.uWindow, settings.shineSize / 360 + state.press * 0.06, settings.shineFade / 360 + 0.0001);
      gl.uniform1f(uniforms.uThickness, settings.thickness);
      gl.uniform1f(uniforms.uGlow, settings.glow);
      gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
    };

    const frame = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const target = aim();
      if (!state.ready) { state.spot = restSpot(); state.level = settings.idleIntensity; state.ready = true; }
      if (target && target.near > 0) {
        let diff = target.spot - state.spot; diff -= Math.round(diff);
        state.spot = wrap(state.spot + diff * (1 - Math.exp(-dt * 8)));
      } else {
        let diff = restSpot() - state.spot; diff -= Math.round(diff);
        state.spot = wrap(state.spot + diff * (1 - Math.exp(-dt * 8)));
      }
      const level = settings.idleIntensity + (1 - settings.idleIntensity) * (target ? target.near : 0);
      state.level += (level - state.level) * (1 - Math.exp(-dt * 7));
      state.press *= Math.exp(-dt * 5);
      draw();
      requestAnimationFrame(frame);
    };

    const measure = () => {
      view.width = button.offsetWidth; view.height = button.offsetHeight;
      view.ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round((view.width + PAD * 2) * view.ratio);
      canvas.height = Math.round((view.height + PAD * 2) * view.ratio);
      canvas.style.width = `${view.width + PAD * 2}px`; canvas.style.height = `${view.height + PAD * 2}px`;
      canvas.style.top = `-${PAD}px`; canvas.style.left = `-${PAD}px`;
      draw();
    };

    window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.known = true; }, { passive: true });
    button.addEventListener('pointerdown', () => { state.press = 1; });
    window.addEventListener('resize', measure);
    measure();
    requestAnimationFrame(frame);
  }

  return { init };
})();

// ==========================================
// 2. MAGIC RINGS (WebGL2 Pulsing Concentric Rings)
// ==========================================
const MagicRingsModule = (() => {
  const MAX_RINGS = 12, MAX_BURSTS = 3, SLOTS = MAX_RINGS + MAX_BURSTS, SEGMENTS = 128;
  const FULLSCREEN = `#version 300 es
  precision highp float;
  const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  void main() { gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0); }`;

  const STRIP = `#version 300 es
  precision highp float;
  #define SLOTS 15
  layout(location = 0) in vec2 aSegment;
  uniform mat3 uForward; uniform vec2 uResolution; uniform float uUnit; uniform vec2 uCenter;
  uniform vec4 uShape[SLOTS]; uniform vec4 uFrame[SLOTS]; uniform float uReach;
  flat out int vSlot; out vec2 vPlane;
  void main() {
    vec4 shape = uShape[gl_InstanceID];
    vec2 origin = uCenter + uFrame[gl_InstanceID].xy;
    float angle = aSegment.x * 6.2831853;
    vec2 direction = vec2(cos(angle), sin(angle));
    vec3 inner = uForward * vec3(origin + direction * shape.x, 1.0);
    vec3 outer = uForward * vec3(origin + direction * (shape.x + 0.01), 1.0);
    float pixels = length(outer.xy / outer.z - inner.xy / inner.z) * 100.0 * uUnit;
    float band = uReach / max(pixels, 1e-3);
    vec2 plane = origin + direction * max(shape.x + aSegment.y * band, 0.0);
    vec3 screen = uForward * vec3(plane, 1.0);
    gl_Position = vec4(screen.xy * (2.0 * uUnit / uResolution), 0.0, screen.z);
    vPlane = plane; vSlot = gl_InstanceID;
  }`;

  const COMMON = `#define SLOTS 15
  uniform vec2 uResolution; uniform float uUnit; uniform mat3 uInverse; uniform vec2 uCenter;
  uniform int uCount; uniform vec4 uShape[SLOTS]; uniform vec4 uFrame[SLOTS]; uniform vec4 uTint[SLOTS];
  uniform vec4 uHover; uniform vec2 uBounds; uniform float uOpacity; out vec4 fragColor;
  float nearness(vec2 plane) { vec2 offset = plane - uHover.xy; return uHover.z * exp(-dot(offset, offset) * uHover.w); }`;

  const GLOW = `#version 300 es
  precision highp float;
  ${COMMON}
  uniform vec4 uHalo;
  float haloOf(float d) { float fall = exp(-d * uHalo.y); return (uHalo.z * fall * fall + uHalo.w * fall); }
  void main() {
    vec3 projected = uInverse * vec3((gl_FragCoord.xy - 0.5 * uResolution) / uUnit, 1.0);
    vec2 plane = projected.xy / projected.z;
    vec2 base = plane - uCenter;
    float reach = length(base);
    if (projected.z <= 0.0 || reach < uBounds.x || reach > uBounds.y) { fragColor = vec4(0.0); return; }
    vec3 light = vec3(0.0); float alpha = 0.0;
    for (int i = 0; i < SLOTS; i++) {
      if (i >= uCount) break;
      vec4 shape = uShape[i]; vec4 frame = uFrame[i];
      vec2 w = base - frame.xy; float d = abs(length(w) - shape.x);
      if (d > 0.3) continue;
      float energy = shape.y * exp(-shape.z * 0.1);
      vec3 halo = vec3(haloOf(d));
      float layer = clamp(energy * dot(halo, vec3(0.3333)), 0.0, 1.0);
      light = uTint[i].rgb * layer + light * (1.0 - layer);
      alpha = layer + alpha * (1.0 - layer);
    }
    fragColor = vec4(light, alpha);
  }`;

  const COMPOSE = `#version 300 es
  precision highp float;
  ${COMMON}
  uniform sampler2D uGlow;
  void main() {
    vec4 glow = texture(uGlow, gl_FragCoord.xy / uResolution);
    fragColor = vec4(glow.rgb, glow.a) * uOpacity;
  }`;

  const LINE = `#version 300 es
  precision highp float;
  ${COMMON}
  flat in int vSlot; in vec2 vPlane; uniform float uWidth;
  void main() {
    vec4 shape = uShape[vSlot]; vec4 frame = uFrame[vSlot]; vec4 tint = uTint[vSlot];
    vec2 w = vPlane - uCenter - frame.xy; float len = length(w);
    float d = abs(len - shape.x);
    float core = clamp(1.0 - d / (uWidth * 0.02), 0.0, 1.0);
    if (core <= 0.0) discard;
    fragColor = vec4(tint.rgb, core) * uOpacity;
  }`;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const parseHex = (hex) => {
    if (!hex) return [0.035, 0.41, 0.85];
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
  };

  const invert = m => {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [A, c * h - b * i, b * f - c * e, B, a * i - c * g, c * d - a * f, C, b * g - a * h, a * e - b * d].map(v => v / det);
  };
  const planeFor = (tiltX, tiltY) => {
    const ax = (tiltX * Math.PI) / 180, ay = (tiltY * Math.PI) / 180;
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
    const forward = [cy, sy * sx, 0, 0, cx, 0, (sy * cx) / 2.6, -sx / 2.6, 1];
    return { forward, inverse: invert(forward) };
  };

  function createProgram(gl, vSrc, fSrc) {
    const v = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(v, vSrc); gl.compileShader(v);
    const f = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(f, fSrc); gl.compileShader(f);
    const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    const uniforms = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(p, i);
      uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
    }
    return { program: p, uniforms };
  }

  function init(container) {
    if (!container) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'magic-rings__canvas';
    canvas.style.position = 'absolute'; canvas.style.inset = '0';
    canvas.style.width = '100%'; canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; canvas.style.zIndex = '0';
    container.style.position = 'relative'; container.prepend(canvas);

    const gl = canvas.getContext('webgl2', { alpha: true, depth: false });
    if (!gl) return;

    const glowProg = createProgram(gl, FULLSCREEN, GLOW);
    const composeProg = createProgram(gl, FULLSCREEN, COMPOSE);
    const lineProg = createProgram(gl, STRIP, LINE);

    const vao = gl.createVertexArray();
    const stripVao = gl.createVertexArray();
    const stripBuffer = gl.createBuffer();
    const strip = new Float32Array((SEGMENTS + 1) * 4);
    for (let i = 0; i <= SEGMENTS; i++) strip.set([i / SEGMENTS, -1, i / SEGMENTS, 1], i * 4);
    gl.bindVertexArray(stripVao); gl.bindBuffer(gl.ARRAY_BUFFER, stripBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, strip, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const glowTex = gl.createTexture(), glowFbo = gl.createFramebuffer();
    const shape = new Float32Array(SLOTS * 4), frameData = new Float32Array(SLOTS * 4), tints = new Float32Array(SLOTS * 4);
    const size = { width: 1, height: 1, ratio: 1, unit: 1 };
    const pointer = { x: 0, y: 0, inside: false };
    const spring = { x: 0, y: 0, vx: 0, vy: 0, hover: 0 };
    const bursts = [];
    const settings = {
      color: parseHex(container.dataset.color || '#0969da'),
      colorTwo: parseHex(container.dataset.colorTwo || '#8250df'),
      ringCount: parseInt(container.dataset.ringCount || '6'),
      speed: 1, baseRadius: 0.35, radiusStep: 0.1, expansion: 0.1, opacity: 0.85
    };
    let time = 0, clock = 0, last = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * ratio)), h = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      Object.assign(size, { width: w, height: h, ratio, unit: Math.max(1, Math.min(w, h)) });
      gl.bindTexture(gl.TEXTURE_2D, glowTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, Math.max(1, Math.ceil(w / 2)), Math.max(1, Math.ceil(h / 2)), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, glowFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glowTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const render = () => {
      const count = settings.ringCount;
      const view = planeFor(15 - spring.y * 12, spring.x * 12);
      let slots = 0;
      for (let i = 0; i < count; i++) {
        const t = ((time - i * 0.5) % 3.45 + 3.45) % 3.45;
        const radius = settings.baseRadius + i * settings.radiusStep + (1 - Math.pow(1 - t / 3.45, 2)) * settings.expansion;
        shape.set([radius, 1.0, 1.5, 2], slots * 4);
        frameData.set([i * 0.04 * spring.x, i * 0.04 * spring.y, 1, 0], slots * 4);
        const mix = i / (count - 1);
        tints.set([
          settings.color[0] + (settings.colorTwo[0] - settings.color[0]) * mix,
          settings.color[1] + (settings.colorTwo[1] - settings.color[1]) * mix,
          settings.color[2] + (settings.colorTwo[2] - settings.color[2]) * mix,
          1
        ], slots * 4);
        slots++;
      }
      if (!slots) return;

      const shared = (p) => {
        const u = p.uniforms; gl.useProgram(p.program);
        gl.uniform2f(u.uResolution, canvas.width, canvas.height);
        gl.uniform1f(u.uUnit, size.unit); gl.uniform2f(u.uCenter, 0, 0);
        gl.uniform1i(u.uCount, slots); gl.uniform4fv(u.uShape, shape);
        gl.uniform4fv(u.uFrame, frameData); gl.uniform4fv(u.uTint, tints);
        gl.uniform4f(u.uHover, 0, 0, spring.hover, 1 / 0.03); gl.uniform1f(u.uOpacity, settings.opacity);
        return u;
      };

      gl.bindVertexArray(vao); gl.bindFramebuffer(gl.FRAMEBUFFER, glowFbo);
      gl.viewport(0, 0, Math.ceil(canvas.width / 2), Math.ceil(canvas.height / 2));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const gu = shared(glowProg);
      gl.uniformMatrix3fv(gu.uInverse, true, view.inverse);
      gl.uniform2f(gu.uBounds, 0, 2);
      gl.uniform4f(gu.uHalo, 0, 25, 0.6, 1.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const cu = shared(composeProg);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, glowTex);
      gl.uniform1i(cu.uGlow, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const lu = shared(lineProg);
      gl.uniformMatrix3fv(lu.uForward, true, view.forward);
      gl.uniform1f(lu.uReach, 2.5 * size.ratio);
      gl.uniform1f(lu.uWidth, 1.8 * size.ratio);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(stripVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2, slots);
      gl.disable(gl.BLEND); gl.bindVertexArray(null);
    };

    const frame = (now) => {
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = now; clock += dt; time += dt * settings.speed;
      const targetX = pointer.inside ? pointer.x : 0;
      const targetY = pointer.inside ? pointer.y : 0;
      spring.vx += (70 * (targetX - spring.x) - 15 * spring.vx) * dt;
      spring.vy += (70 * (targetY - spring.y) - 15 * spring.vy) * dt;
      spring.x += spring.vx * dt; spring.y += spring.vy * dt;
      render();
      requestAnimationFrame(frame);
    };

    container.addEventListener('pointermove', (e) => {
      const rect = container.getBoundingClientRect();
      const unit = Math.max(1, Math.min(rect.width, rect.height));
      pointer.x = (e.clientX - rect.left - rect.width / 2) / unit;
      pointer.y = (rect.top + rect.height / 2 - e.clientY) / unit;
      pointer.inside = true;
    });
    container.addEventListener('pointerleave', () => { pointer.inside = false; });
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
  }

  return { init };
})();

// ========================================================
// 3. RUBBER SEGMENT (Elastic Spring-Physics Control)
// ========================================================
// ========================================================
// 3. RUBBER SEGMENT (Elastic Spring-Physics Control)
// ========================================================
const RubberSegmentModule = (() => {
  const RUBBER = 0.55;
  const FLICK = 110;
  const DEADZONE = 4;
  const SLOP = 10;
  const MAX_VELOCITY = 2000;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const rubber = (over, dim) => (over * dim * RUBBER) / (dim + RUBBER * Math.abs(over));

  const velocityOf = (hist, now) => {
    const recent = hist.filter(([t]) => now - t <= 100);
    if (recent.length < 2) return 0;
    const [t0, x0] = recent[0];
    const [t1, x1] = recent[recent.length - 1];
    return t1 - t0 >= 8 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
  };

  const project = (v, glide = 75) => {
    const d = 1 - 0.1 * Math.pow(0.05, glide / 100);
    return ((v / 1000) * d) / (1 - d);
  };

  function init(track) {
    if (!track || track.dataset.initialized) return;
    track.dataset.initialized = 'true';

    const items = Array.from(track.querySelectorAll('.rubber-segment__item:not(.rubber-segment__copy)'));
    if (!items.length) return;

    // Check configuration datasets
    const stretch = parseFloat(track.dataset.stretch || '100');
    const squash = parseFloat(track.dataset.squash || '3');
    const speed = parseFloat(track.dataset.speed || '1');
    const glide = parseFloat(track.dataset.glide || '75');
    const draggable = track.dataset.draggable !== 'false';
    const inset = parseFloat(getComputedStyle(track).getPropertyValue('--rs-inset')) || 3;
    const radius = parseFloat(getComputedStyle(track).getPropertyValue('--rs-radius')) || 10;
    const thumbRadius = Math.max(0, radius - inset);

    // Build or ensure thumb container with copies for clipped inverted text
    let thumb = track.querySelector('.rubber-segment__thumb');
    if (!thumb) {
      thumb = document.createElement('div');
      thumb.className = 'rubber-segment__thumb';
      thumb.setAttribute('aria-hidden', 'true');
      items.forEach(item => {
        const span = document.createElement('span');
        span.className = 'rubber-segment__copy';
        span.innerHTML = item.innerHTML;
        thumb.appendChild(span);
      });
      track.appendChild(thumb);
    }

    let slots = [], currentIndex = 0, edgeL = 0, edgeR = 0, innerW = 0;
    let handoffTimer = null, relaxTimer = null;

    items.forEach((item, i) => {
      if (item.getAttribute('aria-checked') === 'true' || item.classList.contains('active')) currentIndex = i;
    });

    const measure = () => {
      const rect = track.getBoundingClientRect();
      innerW = rect.width - inset * 2;
      slots = items.map((el, idx) => {
        const r = el.getBoundingClientRect();
        if (thumb && thumb.children[idx]) {
          thumb.children[idx].style.width = `${r.width}px`;
        }
        return { l: r.left - rect.left - inset, r: r.right - rect.left - inset, w: r.width };
      });
      jumpTo(currentIndex);
    };

    const updateThumbStyles = (l, r) => {
      edgeL = l; edgeR = r;
      const roundR = thumbRadius;
      const rightInset = Math.max(0, innerW - r);
      const leftInset = Math.max(0, l);
      thumb.style.clipPath = `inset(0px ${rightInset.toFixed(1)}px 0px ${leftInset.toFixed(1)}px round ${roundR}px)`;
      thumb.style.webkitClipPath = `inset(0px ${rightInset.toFixed(1)}px 0px ${leftInset.toFixed(1)}px round ${roundR}px)`;
      thumb.style.left = `${inset}px`;
      thumb.style.right = `${inset}px`;
    };

    const jumpTo = (i) => {
      currentIndex = clamp(i, 0, items.length - 1);
      const s = slots[currentIndex];
      if (!s) return;
      thumb.style.transition = 'none';
      updateThumbStyles(s.l, s.r);
      items.forEach((item, idx) => {
        const active = idx === currentIndex;
        item.setAttribute('aria-checked', active ? 'true' : 'false');
        if (active) item.classList.add('active');
        else item.classList.remove('active');
      });
    };

    const animateTo = (to, withSquash = true, flick = false, v = null) => {
      const from = currentIndex;
      currentIndex = clamp(to, 0, items.length - 1);
      const a = slots[from], b = slots[currentIndex];
      if (!a || !b) return;

      clearTimeout(handoffTimer);
      clearTimeout(relaxTimer);

      const dir = Math.sign(b.l - a.l) || 1;
      const u = stretch / 100;
      const leadL = b.l + (Math.min(a.l, b.l) - b.l) * u;
      const leadR = b.r + (Math.max(a.r, b.r) - b.r) * u;

      // Stretch phase
      thumb.style.transition = `clip-path ${0.19 / speed}s cubic-bezier(0.23, 1, 0.32, 1)`;
      updateThumbStyles(leadL, leadR);

      // Snap & Land phase
      handoffTimer = setTimeout(() => {
        const landDuration = (flick ? 0.38 : 0.30) / speed;
        thumb.style.transition = `clip-path ${landDuration}s cubic-bezier(0.175, 0.885, 0.32, 1.25)`;
        const squashOffset = withSquash && squash > 0 ? dir * squash : 0;
        updateThumbStyles(b.l + (dir < 0 ? squashOffset : 0), b.r + (dir > 0 ? squashOffset : 0));

        items.forEach((item, idx) => {
          const active = idx === currentIndex;
          item.setAttribute('aria-checked', active ? 'true' : 'false');
          if (active) item.classList.add('active');
          else item.classList.remove('active');
        });

        if (withSquash && squash > 0) {
          relaxTimer = setTimeout(() => {
            thumb.style.transition = `clip-path ${0.16 / speed}s ease-out`;
            updateThumbStyles(b.l, b.r);
          }, landDuration * 600);
        }
      }, (0.15 / speed) * 1000);

      const selectedValue = items[currentIndex].dataset.value || items[currentIndex].textContent.trim();
      track.dispatchEvent(new CustomEvent('segment-change', { detail: { value: selectedValue, index: currentIndex } }));
    };

    items.forEach((item, i) => {
      item.addEventListener('click', (e) => {
        const href = item.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          e.preventDefault();
          if (i !== currentIndex) {
            animateTo(i, true, false);
            setTimeout(() => {
              window.location.href = href;
            }, 140);
          } else {
            window.location.href = href;
          }
          return;
        }
        e.preventDefault();
        if (i !== currentIndex) animateTo(i, true, false);
      });
      item.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(items.length - 1, currentIndex + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, currentIndex - 1);
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = items.length - 1;
        if (next !== null && next !== currentIndex) {
          e.preventDefault();
          animateTo(next, true, false);
          items[next]?.focus();
          const href = items[next]?.getAttribute('href');
          if (href && href !== '#' && !href.startsWith('javascript:')) {
            setTimeout(() => { window.location.href = href; }, 140);
          }
        }
      });
    });

    let drag = null;
    const localX = (clientX) => clientX - track.getBoundingClientRect().left - inset;

    track.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !draggable) return;
      const x = localX(e.clientX);
      const onThumb = x >= edgeL && x <= edgeR;
      drag = {
        id: e.pointerId,
        x0: x,
        slot: currentIndex,
        onThumb,
        live: false,
        offset: x - edgeL,
        w: edgeR - edgeL,
        hist: [[Date.now(), x]]
      };
      if (onThumb) {
        track.dataset.held = '';
        thumb.style.transition = 'none';
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!drag || !drag.onThumb) return;
      const x = localX(e.clientX);
      drag.hist.push([Date.now(), x]);
      if (drag.hist.length > 8) drag.hist.shift();
      if (!drag.live && Math.abs(x - drag.x0) >= DEADZONE) drag.live = true;
      if (drag.live) {
        let l = x - drag.offset;
        const maxL = innerW - drag.w;
        if (l < 0) l = rubber(l, drag.w);
        else if (l > maxL) l = maxL + rubber(l - maxL, drag.w);
        updateThumbStyles(l, l + drag.w);
      }
    }, { passive: true });

    const finishDrag = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      delete track.dataset.held;
      if (!d.live) return;

      const v = velocityOf(d.hist, Date.now());
      const flick = Math.abs(v) > FLICK;
      const thumbCenter = (edgeL + edgeR) / 2 + project(v, glide);
      let bestSlot = 0, minDiff = Infinity;
      slots.forEach((s, idx) => {
        const diff = Math.abs((s.l + s.r) / 2 - thumbCenter);
        if (diff < minDiff) { minDiff = diff; bestSlot = idx; }
      });
      if (flick && bestSlot === currentIndex) {
        bestSlot = clamp(bestSlot + Math.sign(v), 0, items.length - 1);
      }
      animateTo(bestSlot, true, flick, v);

      const targetLink = items[bestSlot];
      const href = targetLink?.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        setTimeout(() => { window.location.href = href; }, 160);
      }
    };

    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    window.addEventListener('resize', measure);
    setTimeout(measure, 60);
  }

  return { init };
})();

// ========================================================
// 4. MAGIC BENTO (3D Tilt, Border Glow, Spotlight, Waves)
// ========================================================
// 4. MAGIC BENTO (3D Tilt, Border Glow, Spotlight, Waves, Charts & Switches)
// ========================================================
const MagicBentoModule = (() => {
  const TILT = 5.5;
  const MAGNET = 4;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const CHART_DATA = [3.1, 3.8, 3.5, 4.9, 4.4, 5.8, 5.3, 6.9, 6.5, 8.2, 9.4, 12.4];

  function setupChart(chartEl) {
    if (!chartEl || chartEl.dataset.initialized) return;
    chartEl.dataset.initialized = 'true';

    const plot = chartEl.querySelector('.magic-bento__plot');
    const valEl = chartEl.querySelector('.magic-bento__figure-value');
    const noteEl = chartEl.querySelector('.magic-bento__figure-note');
    if (!plot) return;

    let svg = plot.querySelector('svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = `
        <path class="magic-bento__chart-area" d=""></path>
        <path class="magic-bento__chart-line" d="" pathLength="1"></path>
      `;
      plot.appendChild(svg);
    }

    let scrub = plot.querySelector('.magic-bento__scrub');
    if (!scrub) {
      scrub = document.createElement('span');
      scrub.className = 'magic-bento__scrub';
      scrub.innerHTML = '<span class="magic-bento__scrub-dot"></span>';
      plot.appendChild(scrub);
    }
    const dot = scrub.querySelector('.magic-bento__scrub-dot');

    const renderPath = () => {
      const w = plot.clientWidth || 200, h = plot.clientHeight || 50;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const low = Math.min(...CHART_DATA) * 0.7;
      const high = Math.max(...CHART_DATA);
      const points = CHART_DATA.map((v, i) => [
        (i / (CHART_DATA.length - 1)) * w,
        6 + (1 - (v - low) / (high - low)) * (h - 12)
      ]);

      let line = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i], p1 = points[i + 1];
        const mx = (p0[0] + p1[0]) / 2;
        line += ` C${mx.toFixed(1)},${p0[1].toFixed(1)} ${mx.toFixed(1)},${p1[1].toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
      }
      const area = `${line} L${w},${h} L0,${h} Z`;
      const areaPath = svg.querySelector('.magic-bento__chart-area');
      const linePath = svg.querySelector('.magic-bento__chart-line');
      if (areaPath) areaPath.setAttribute('d', area);
      if (linePath) linePath.setAttribute('d', line);
    };

    const scrubPointer = (e) => {
      const rect = plot.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      const pos = (x / Math.max(1, rect.width)) * (CHART_DATA.length - 1);
      const idx = Math.floor(pos);
      const next = Math.min(CHART_DATA.length - 1, idx + 1);
      const val = CHART_DATA[idx] + (CHART_DATA[next] - CHART_DATA[idx]) * (pos - idx);
      chartEl.dataset.scrub = '';
      scrub.style.transform = `translateX(${x.toFixed(1)}px)`;
      const low = Math.min(...CHART_DATA) * 0.7;
      const high = Math.max(...CHART_DATA);
      const y = 6 + (1 - (val - low) / (high - low)) * ((rect.height || 50) - 12);
      if (dot) dot.style.transform = `translateY(${y.toFixed(1)}px)`;
      if (valEl) valEl.textContent = `${val.toFixed(1)}k`;
      if (noteEl) noteEl.textContent = `Oct ${Math.round(pos) + 1}`;
    };

    const restPointer = () => {
      delete chartEl.dataset.scrub;
      if (valEl) valEl.textContent = `${CHART_DATA[CHART_DATA.length - 1].toFixed(1)}k`;
      if (noteEl) noteEl.textContent = '+18%';
    };

    chartEl.addEventListener('pointermove', scrubPointer);
    chartEl.addEventListener('pointerdown', scrubPointer);
    chartEl.addEventListener('pointerleave', restPointer);
    window.addEventListener('resize', renderPath);
    setTimeout(renderPath, 80);
  }

  function init(root) {
    if (!root) return;
    const cells = Array.from(root.querySelectorAll('.magic-bento__cell'));
    const cards = Array.from(root.querySelectorAll('.magic-bento__card'));
    if (!cards.length && !cells.length) return;

    // Stagger in cells
    cells.forEach((cell, i) => {
      cell.style.setProperty('--mb-delay', `${i * 70}ms`);
      requestAnimationFrame(() => { cell.dataset.state = 'in'; });
    });

    // Setup nested charts and interactive switches
    root.querySelectorAll('.magic-bento__chart').forEach(setupChart);
    root.querySelectorAll('.magic-bento__switch').forEach(sw => {
      sw.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sw.hasAttribute('data-off')) sw.removeAttribute('data-off');
        else sw.setAttribute('data-off', '');
      });
    });

    let bounds = root.getBoundingClientRect();
    const pointer = { x: -1e5, y: -1e5, inside: false, down: -1 };
    const light = { x: -1e5, y: -1e5, near: 0 };
    const states = cards.map(() => ({
      rx: 0, ry: 0, tx: 0, ty: 0, vrx: 0, vry: 0, hot: 0, press: 1, active: false
    }));
    const wave = { x: 0, y: 0, t: -1, duration: 1.1, reach: 800 };
    let last = 0;

    const measure = () => { bounds = root.getBoundingClientRect(); };

    const startWave = (x, y) => {
      wave.x = x; wave.y = y; wave.t = 0;
      wave.reach = Math.max(
        Math.hypot(x - bounds.left, y - bounds.top),
        Math.hypot(x - bounds.right, y - bounds.bottom)
      ) + 140;
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const near = pointer.inside ? 1 : 0;
      light.near += (near - light.near) * 0.15;
      light.x += (pointer.x - light.x) * 0.22;
      light.y += (pointer.y - light.y) * 0.22;

      let waveRadius = 0, waveAlpha = 0;
      if (wave.t >= 0) {
        wave.t += dt;
        const progress = Math.min(1, wave.t / wave.duration);
        waveRadius = wave.reach * (1 - Math.pow(1 - progress, 2.2));
        waveAlpha = Math.pow(1 - progress, 1.3);
        if (progress >= 1) wave.t = -1;
      }

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const state = states[index] || {};
        const lx = light.x - rect.left;
        const ly = light.y - rect.top;
        const px = pointer.x - rect.left;
        const py = pointer.y - rect.top;
        const inside = pointer.inside && px >= 0 && py >= 0 && px <= rect.width && py <= rect.height;

        if (inside !== state.active) {
          state.active = inside;
          if (inside) card.dataset.active = '';
          else delete card.dataset.active;
        }

        const hotTarget = inside ? 1 : 0;
        state.hot += (hotTarget - state.hot) * 0.2;

        const u = clamp(px / Math.max(1, rect.width), 0, 1) - 0.5;
        const v = clamp(py / Math.max(1, rect.height), 0, 1) - 0.5;
        const targetRx = inside ? -v * 2 * TILT : 0;
        const targetRy = inside ? u * 2 * TILT : 0;
        const targetTx = inside ? u * 2 * MAGNET : 0;
        const targetTy = inside ? v * 2 * MAGNET : 0;

        state.vrx += (170 * (targetRx - state.rx) - 20 * state.vrx) * dt;
        state.vry += (170 * (targetRy - state.ry) - 20 * state.vry) * dt;
        state.rx += state.vrx * dt;
        state.ry += state.vry * dt;
        state.tx += (targetTx - state.tx) * 0.15;
        state.ty += (targetTy - state.ty) * 0.15;

        const pressTarget = pointer.down === index ? 0.985 : 1;
        state.press += (pressTarget - state.press) * 0.25;

        card.style.setProperty('--mb-x', `${lx.toFixed(1)}px`);
        card.style.setProperty('--mb-y', `${ly.toFixed(1)}px`);
        card.style.setProperty('--mb-near', light.near.toFixed(3));
        card.style.setProperty('--mb-hot', state.hot.toFixed(3));
        card.style.setProperty('--mb-rx', `${state.rx.toFixed(2)}deg`);
        card.style.setProperty('--mb-ry', `${state.ry.toFixed(2)}deg`);
        card.style.setProperty('--mb-tx', `${state.tx.toFixed(2)}px`);
        card.style.setProperty('--mb-ty', `${state.ty.toFixed(2)}px`);
        card.style.setProperty('--mb-press', state.press.toFixed(3));
        card.style.setProperty('--mb-wx', `${(wave.x - rect.left).toFixed(1)}px`);
        card.style.setProperty('--mb-wy', `${(wave.y - rect.top).toFixed(1)}px`);
        card.style.setProperty('--mb-wr', `${waveRadius.toFixed(1)}px`);
        card.style.setProperty('--mb-wa', waveAlpha.toFixed(3));
      });

      requestAnimationFrame(frame);
    };

    const cardIndex = (target) => {
      const card = target.closest('.magic-bento__card');
      return card ? cards.indexOf(card) : -1;
    };

    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true;
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      if (!e.relatedTarget) { pointer.inside = false; pointer.down = -1; }
    });

    root.addEventListener('pointerdown', (e) => {
      pointer.down = cardIndex(e.target);
    });

    window.addEventListener('pointerup', () => { pointer.down = -1; });
    window.addEventListener('pointercancel', () => { pointer.down = -1; });

    root.addEventListener('click', (e) => {
      startWave(e.clientX, e.clientY);
    });

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    measure();
    requestAnimationFrame(frame);
  }

  return { init };
})();

// Auto-initialize components on page load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.magic-rings').forEach(el => MagicRingsModule.init(el));
  document.querySelectorAll('.specular-button').forEach(el => SpecularButtonModule.init(el));
  document.querySelectorAll('.rubber-segment').forEach(el => RubberSegmentModule.init(el));
  document.querySelectorAll('.magic-bento').forEach(el => MagicBentoModule.init(el));
});

