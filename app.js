/* Clarity — a living drawing.
 * PixiJS 7 (WebGL layers + custom shaders) · GSAP 3 (cinematic timeline) · Web Audio API
 * Expects 4 same-size transparent PNGs in public/assets (see ASSETS_PREP.md). */
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

(() => {
  'use strict';

  /* ─────────────── CONFIG ─────────────── */
  const CONFIG = {
    assets: {
      bg:    'assets/bg_topo.png',
      body:  'assets/body_base.png',
      chest: 'assets/chest_scribbles.png',
      head:  'assets/head_waves.png',
      intro: 'assets/alivetopographic lines.mp4',     // optional: the neon shader stands in if missing
      music: ['assets/clarity.mp3', 'assets/lofi.mp3']  // first one found wins; a generative loop if none
    },
    // Key points on the artwork, normalised 0–1 (x from left, y from top). Tune after slicing.
    pts: {
      chest: { x: 0.50,  y: 0.86 },
      earL:  { x: 0.410, y: 0.439 },
      earR:  { x: 0.580, y: 0.437 }
    }
  };

  const $ = (s) => document.querySelector(s);

  /* Animated state — GSAP tweens these, the ticker feeds them to the shaders */
  const S   = { bgSpeed: 1.4, bgAmp: 0.02, wave: 0.0035, chInt: 0, chSpeed: 1, shake: 0, react: 0, parallax: 0 };
  const cam = { x: 0.5, y: 0.5, zoom: 1, kick: 0 };      // camera in artwork space (0–1)
  const intro = { zoom: 1.8, alpha: 1 };                  // Scene 1 layer: starts close, pulls back, fades out
  const backdrop = { alpha: 1 };                          // 0 = black, 1 = paper tone around the artwork
  const par = { tx: 0, ty: 0, x: 0, y: 0 };               // pointer parallax
  const clock = { bg: 0, ch: 0, head: 0, neon: 0 };

  /* ─────────────── SHADERS ─────────────── */
  const VERT = `
    precision highp float;
    attribute vec2 aVertexPosition; attribute vec2 aUvs;
    uniform mat3 translationMatrix; uniform mat3 projectionMatrix;
    varying vec2 vUvs;
    void main(){ vUvs = aUvs;
      gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0); }`;

  const VERT_SCREEN = `
    precision highp float;
    attribute vec2 aVertexPosition; attribute vec2 aUvs; varying vec2 vUvs;
    void main(){ vUvs = aUvs; gl_Position = vec4(aVertexPosition * 2.0 - 1.0, 0.0, 1.0); }`;

  const NOISE = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
      return mix(mix(hash(i), hash(i + vec2(1.,0.)), f.x), mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }`;

  const layerFrag = (uniforms, body) =>
    `precision highp float; varying vec2 vUvs; uniform sampler2D uTex; uniform float uAspect; ${uniforms} ${NOISE}
     void main(){ ${body} }`;

  // Scene 1 — black ink topographic contours on paper (procedural stand-in when the intro video is missing)
  const FRAG_NEON = `
    precision highp float; varying vec2 vUvs; uniform float uTime, uAspect, uZoom, uAlpha; ${NOISE}
    void main(){
      vec2 p = (vUvs - 0.5) * vec2(uAspect, 1.0) * 3.4 / uZoom;
      vec2 q = vec2(fbm(p + uTime*0.15), fbm(p + vec2(5.2, 1.3) - uTime*0.12));
      float h = fbm(p + 2.4*q + vec2(0.0, uTime*0.08));
      float d = abs(fract(h * 16.0) - 0.5);
      float line = 1.0 - smoothstep(0.03, 0.09, d);
      gl_FragColor = vec4(vec3(1.0 - line), 1.0) * uAlpha;
    }`;

  // Background ink lines — fluid displacement (breathing in Scene 4, frantic in Scene 2)
  // plus a ripple that never stops travelling outward, so the dense contours read as an optical-illusion flow
  const FRAG_BG = layerFrag('uniform float uTime, uAmp, uScale, uWave, uWaveT;', `
    vec2 uv = vUvs;
    vec2 p = vec2(uv.x * uAspect, uv.y) * uScale;
    vec2 d = vec2(fbm(p + vec2(uTime*0.5, 0.0)), fbm(p + vec2(7.3, uTime*0.43))) - 0.5;
    vec2 c = (uv - 0.5) * vec2(uAspect, 1.0);
    float r = length(c), a = atan(c.y, c.x);
    float ripple = sin(r * 34.0 - uWaveT * 1.4 + 1.5 * sin(a * 3.0 + uWaveT * 0.2));
    vec2 w = (c / max(r, 1e-4)) * ripple * uWave / vec2(uAspect, 1.0);
    gl_FragColor = texture2D(uTex, uv + d * uAmp + w);`);

  // Chest scribbles — twist + jitter + heartbeat pulse, all scaled by uInt (1 = violent, ~0.06 = tamed)
  const FRAG_CHEST = layerFrag('uniform float uTime, uInt; uniform vec2 uCenter;', `
    vec2 uv = vUvs;
    vec2 c = (uv - uCenter) * vec2(uAspect, 1.0);
    float fall  = smoothstep(0.75, 0.05, length(c));
    float pulse = 0.5 + 0.5 * sin(uTime * 6.5);
    float a = uInt * fall * (0.30 * sin(uTime * 2.3) + 0.30 * pulse);
    float s = sin(a), co = cos(a);
    c = mat2(co, -s, s, co) * c * (1.0 - 0.07 * uInt * pulse);
    float st = floor(uTime * 16.0);
    vec2 n = vec2(noise(uv * 16.0 + st), noise(uv * 16.0 + st + 31.7)) - 0.5;
    uv = uCenter + c / vec2(uAspect, 1.0) + n * 0.016 * uInt * fall;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);   // no edge-clamp smear
    gl_FragColor = texture2D(uTex, uv) * inside;`);

  // Head waves — gentle idle undulation + Web Audio bass/mid driven vertical displacement
  const FRAG_HEAD = layerFrag('uniform float uTime, uBass, uMid, uReact;', `
    vec2 uv = vUvs;
    float calm = 0.0022 * sin(uv.x * 9.0 + uTime * 0.8) + 0.0014 * sin(uv.x * 17.0 - uTime * 1.2 + uv.y * 22.0);
    float live = uReact * uBass * 0.011 * sin(uv.x * 8.0 - uTime * 2.2 + uv.y * 14.0)
               + uReact * uMid  * 0.004 * sin(uv.x * 26.0 + uTime * 5.0);
    uv.y += calm + live;
    gl_FragColor = texture2D(uTex, uv);`);

  /* ─────────────── AUDIO ─────────────── */
  const audio = (() => {
    let ctx, master, analyser, mGain, mLP, noiseBuf, buf, data, amb, playing = false, cut = false, muted = false;
    const lvl = { bass: 0, mid: 0 };
    const g = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const f = (type, fr, q = 1) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = fr; n.Q.value = q; return n; };
    const ramp = (p, v, t) => { const n = ctx.currentTime; p.cancelScheduledValues(n); p.setValueAtTime(p.value, n); p.linearRampToValueAtTime(v, n + t); };
    const loopNoise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; };
    const tone = (type, f0, f1, t, dur, vol, dest) => {
      const o = ctx.createOscillator(), e = g(vol);
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(e).connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
    };
    const burst = (fr, type, t, dur, vol, dest) => {
      const s = ctx.createBufferSource(), fl = f(type, fr), e = g(vol);
      s.buffer = noiseBuf; e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(fl).connect(e).connect(dest || master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
    };

    function init() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = g(muted ? 0 : 0.8);
      const comp = ctx.createDynamicsCompressor();
      analyser = ctx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.78;
      mGain = g(0); mLP = f('lowpass', 18000, 0.7);
      mGain.connect(mLP); mLP.connect(analyser); analyser.connect(master);   // music → analyser → out
      master.connect(comp); comp.connect(ctx.destination);
      data = new Uint8Array(analyser.frequencyBinCount);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (ctx.state === 'suspended') ctx.resume();
    }

    // Scene 1 bed: muffled static + city hiss + discordant rumble
    function ambience() {
      const lp = f('lowpass', 700), sg = g(0);  loopNoise().connect(lp).connect(sg).connect(master);
      const bp = f('bandpass', 350, 0.5), cg = g(0.06); loopNoise().connect(bp).connect(cg).connect(master);
      const lfo = ctx.createOscillator(), lg = g(0.05); lfo.frequency.value = 0.23; lfo.connect(lg).connect(cg.gain); lfo.start();
      const rl = f('lowpass', 140), rg = g(0); rl.connect(rg).connect(master);
      [41, 43.3, 61.7].forEach((fr) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(rl); o.start(); });
      amb = { sg, cg, rg, lp };
      ramp(sg.gain, 0.1, 2.5); ramp(rg.gain, 0.05, 2.5);
    }
    // k = 0…1 of the full swell, reached over t seconds
    const intensify = (t, k = 1) => {
      if (cut) return;
      ramp(amb.sg.gain, 0.1 + 0.24 * k, t); ramp(amb.cg.gain, 0.06 + 0.08 * k, t);
      ramp(amb.rg.gain, 0.05 + 0.15 * k, t); ramp(amb.lp.frequency, 700 + 1900 * k, t);
    };

    // The "plug-in": static dies instantly, a click + thump lands
    function snap(quiet) {
      if (cut) return; cut = true;
      ['sg', 'cg', 'rg'].forEach((k) => ramp(amb[k].gain, 0, 0.03));
      if (quiet) return;
      const t = ctx.currentTime;
      burst(2500, 'highpass', t, 0.12, 0.7);
      tone('sine', 2400, 300, t, 0.2, 0.3);
      tone('sine', 120, 40, t, 0.28, 0.7);
    }

    async function load(urls) {
      for (const url of urls) {
        try { const r = await fetch(url); if (!r.ok) throw 0; buf = await ctx.decodeAudioData(await r.arrayBuffer()); return; }
        catch (e) { /* try the next one */ }
      }
      buf = null; console.info('No ' + urls.join(' or ') + ' found — using the generative lo-fi loop.');
    }

    // Fallback: tiny generative chillhop loop (76 bpm, swung hats, Fmaj7–Em7–Dm7–Cmaj7)
    function synth() {
      const spb = 60 / 76, m = (n) => 440 * Math.pow(2, (n - 69) / 12);
      const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
      const keys = f('lowpass', 1300); keys.connect(mGain);
      let step = 0, next = ctx.currentTime + 0.1;
      const tick = () => {
        while (next < ctx.currentTime + 0.25) {
          const s = step % 8, bar = Math.floor(step / 8) % 4, t = next + (s % 2 ? spb * 0.06 : 0);
          if (s === 0 || s === 5) tone('sine', 140, 42, t, 0.4, 0.8, mGain);
          if (s === 2 || s === 6) { burst(1800, 'bandpass', t, 0.2, 0.35, mGain); tone('triangle', 200, 120, t, 0.1, 0.18, mGain); }
          burst(8000, 'highpass', t, 0.05, s % 2 ? 0.06 : 0.12, mGain);
          if (s === 0) chords[bar].forEach((n) => tone('triangle', m(n), m(n) * 0.997, t, spb * 3.6, 0.07, keys));
          if (s === 0 || s === 4) tone('sine', m(chords[bar][0] - 12), m(chords[bar][0] - 12) * 0.99, t, spb * 1.6, 0.4, mGain);
          next += spb / 2; step++;
        }
      };
      tick(); setInterval(tick, 50);
    }

    // Music creeps in muffled under the static, rising to `level` over t seconds
    function fadeIn(t, level = 0.35) {
      if (!playing) {
        playing = true;
        mLP.frequency.setValueAtTime(500, ctx.currentTime);
        if (buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(mGain); s.start(); }
        else synth();
      }
      ramp(mGain.gain, level, t); ramp(mLP.frequency, 1600, t);
    }

    // The drop: the low-pass filter sweeps open and the music takes over
    function drop() {
      fadeIn(0.3, 0.9);
      const t = ctx.currentTime;
      mLP.frequency.cancelScheduledValues(t); mLP.frequency.setValueAtTime(Math.max(260, mLP.frequency.value), t);
      mLP.frequency.exponentialRampToValueAtTime(18000, t + 3);
    }

    function mute(on) { muted = on; if (ctx) ramp(master.gain, on ? 0 : 0.8, 0.25); }

    // Called every frame: bass (≈40–215 Hz) and mid energy, with fast attack / slow release
    function update() {
      if (!analyser) return;
      analyser.getByteFrequencyData(data);
      let b = 0, md = 0;
      for (let i = 1; i <= 5; i++) b += data[i];
      for (let i = 6; i < 40; i++) md += data[i];
      b = Math.min(1, Math.pow(b / 5 / 255, 1.6) * 1.4);
      md = Math.min(1, Math.pow(md / 34 / 255, 1.3) * 1.6);
      lvl.bass = Math.max(b, lvl.bass * 0.9);
      lvl.mid = Math.max(md, lvl.mid * 0.9);
    }
    return { init, ambience, intensify, snap, load, fadeIn, drop, mute, update,
      get muted() { return muted; }, get bass() { return lvl.bass; }, get mid() { return lvl.mid; } };
  })();

  /* ─────────────── SCENE GRAPH ─────────────── */
  let app, W, H, world, fx, neon, video, paperBg, bg, chest, head, tl;

  const layerMesh = (tex, frag, uniforms) => {
    const geo = new PIXI.Geometry()
      .addAttribute('aVertexPosition', [0, 0, W, 0, W, H, 0, H], 2)
      .addAttribute('aUvs', [0, 0, 1, 0, 1, 1, 0, 1], 2)
      .addIndex([0, 1, 2, 0, 2, 3]);
    return new PIXI.Mesh(geo, PIXI.Shader.from(VERT, frag, Object.assign({ uTex: tex, uAspect: W / H }, uniforms)));
  };

  // Resolves with a paused, muted <video> once it can play, or null if the file is missing
  const loadVideo = (url) => new Promise((resolve) => {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto' });
    v.setAttribute('playsinline', '');
    const done = (ok) => { clearTimeout(timer); resolve(ok ? v : null); };
    const timer = setTimeout(() => done(false), 8000);
    v.addEventListener('loadeddata', () => done(true), { once: true });
    v.addEventListener('error', () => done(false), { once: true });
    v.src = encodeURI(url);
  });

  async function boot() {
    const status = $('#status'), begin = $('#begin');
    PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.ON;   // keeps dense line art clean when scaled down
    app = new PIXI.Application({
      resizeTo: window, antialias: true, backgroundColor: 0x000000,
      resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true
    });
    $('#stage').appendChild(app.view);

    const keys = ['bg', 'body', 'chest', 'head'];
    const [res, vid] = await Promise.all([
      Promise.allSettled(keys.map((k) => PIXI.Assets.load(CONFIG.assets[k]))),
      loadVideo(CONFIG.assets.intro)
    ]);
    const missing = keys.filter((k, i) => res[i].status === 'rejected').map((k) => CONFIG.assets[k]);
    if (missing.length) {
      begin.textContent = 'Layers missing';
      status.textContent = 'Could not load: ' + missing.join(', ') + '. See ASSETS_PREP.md.';
      return;
    }
    const tex = {}; keys.forEach((k, i) => (tex[k] = res[i].value));
    W = tex.bg.width; H = tex.bg.height;
    const p = CONFIG.pts;

    // Paper tone around the contain-fitted artwork (faded in at 15 s)
    paperBg = new PIXI.Sprite(PIXI.Texture.WHITE); paperBg.alpha = 0;

    // World: paper → topo background → silhouette/earphones → chest → head waves → fx
    world = new PIXI.Container(); world.visible = false;
    const paper = new PIXI.Graphics().beginFill(0xffffff).drawRect(0, 0, W, H).endFill();
    bg    = layerMesh(tex.bg,    FRAG_BG,    { uTime: 0, uAmp: 0.02, uScale: 3, uWave: 0, uWaveT: 0 });
    const body = new PIXI.Sprite(tex.body);
    chest = layerMesh(tex.chest, FRAG_CHEST, { uTime: 0, uInt: 0, uCenter: [p.chest.x, p.chest.y] });
    head  = layerMesh(tex.head,  FRAG_HEAD,  { uTime: 0, uBass: 0, uMid: 0, uReact: 0 });
    fx = new PIXI.Container();
    world.addChild(paper, bg, body, chest, head, fx);

    // Scene 1: the intro video if supplied, otherwise the neon contour shader, drawn above the world
    if (vid) {
      video = new PIXI.Sprite(PIXI.Texture.from(vid, { resourceOptions: { autoPlay: false } }));
      video.anchor.set(0.5);
      video.source = vid;
    } else {
      const sg = new PIXI.Geometry()
        .addAttribute('aVertexPosition', [0, 0, 1, 0, 1, 1, 0, 1], 2)
        .addAttribute('aUvs', [0, 0, 1, 0, 1, 1, 0, 1], 2).addIndex([0, 1, 2, 0, 2, 3]);
      neon = new PIXI.Mesh(sg, PIXI.Shader.from(VERT_SCREEN, FRAG_NEON, { uTime: 0, uAspect: 1, uZoom: 1, uAlpha: 1 }));
    }
    app.stage.addChild(paperBg, world, video || neon);

    app.ticker.add(tick);
    window.addEventListener('pointermove', (e) => {
      par.tx = (e.clientX / window.innerWidth) * 2 - 1;
      par.ty = (e.clientY / window.innerHeight) * 2 - 1;
    });

    begin.textContent = 'Tap to begin'; begin.disabled = false;
    begin.addEventListener('click', start, { once: true });
  }

  /* Per-frame: clocks → uniforms → parallax → camera */
  function tick() {
    const dt = Math.min(app.ticker.deltaMS / 1000, 0.05);
    const sw = app.screen.width, sh = app.screen.height;
    clock.neon += dt; clock.bg += dt * S.bgSpeed; clock.ch += dt * S.chSpeed; clock.head += dt;
    audio.update();

    paperBg.width = sw; paperBg.height = sh; paperBg.alpha = backdrop.alpha;
    if (neon) {
      neon.visible = intro.alpha > 0;
      Object.assign(neon.shader.uniforms, { uTime: clock.neon, uAspect: sw / sh, uZoom: intro.zoom, uAlpha: intro.alpha });
    }
    if (video) {
      video.visible = intro.alpha > 0;
      const vw = video.source.videoWidth || sw, vh = video.source.videoHeight || sh;
      video.scale.set(Math.max(sw / vw, sh / vh) * intro.zoom);   // cover-fit, then zoom
      video.position.set(sw / 2, sh / 2); video.alpha = intro.alpha;
    }
    if (!world.visible) return;

    bg.shader.uniforms.uTime = clock.bg;      bg.shader.uniforms.uAmp = S.bgAmp;
    bg.shader.uniforms.uWave = S.wave;        bg.shader.uniforms.uWaveT = clock.head;   // steady pace in every scene
    chest.shader.uniforms.uTime = clock.ch;   chest.shader.uniforms.uInt = S.chInt;
    head.shader.uniforms.uTime = clock.head;
    head.shader.uniforms.uBass = audio.bass;  head.shader.uniforms.uMid = audio.mid;
    head.shader.uniforms.uReact = S.react;

    // Scene 4 depth parallax (artwork pixels, scaled to artwork size)
    par.x += (par.tx - par.x) * 0.04; par.y += (par.ty - par.y) * 0.04;
    const k = (S.parallax * W) / 1500;
    bg.position.set(par.x * 10 * k, par.y * 7 * k);
    chest.position.set(-par.x * 8 * k, -par.y * 5 * k);
    head.position.set(-par.x * 5 * k, -par.y * 3 * k);

    // Camera: cover-fit the artwork (no empty bars), then zoom/pan around a normalised focus point,
    // clamped so the view, shake and parallax never run past the artwork's edges. The fit scale leaves room
    // for that margin m (artwork px) so a view as wide as the artwork stays centred instead of being pushed off.
    const m = S.shake / Math.max(sw / W, sh / H) + 12 * k;
    const s = Math.max(sw / (W - 2 * m), sh / (H - 2 * m)) * cam.zoom * (1 + cam.kick);
    const clamp = (v, half, size) => Math.min(Math.max(v, half + m), size - half - m);
    world.scale.set(s);
    world.pivot.set(clamp(cam.x * W, sw / (2 * s), W), clamp(cam.y * H, sh / (2 * s), H));
    world.position.set(sw / 2 + (Math.random() - 0.5) * S.shake, sh / 2 + (Math.random() - 0.5) * S.shake);
  }

  /* ─────────────── JOURNEY ─────────────── */
  // Caption: fade the old line out, the new one in
  function say(text) {
    const el = $('#caption');
    gsap.killTweensOf(el);
    gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: () => {
      el.textContent = text;
      if (text) gsap.to(el, { autoAlpha: 1, duration: 0.9 });
    } });
  }

  function start() {
    $('#gate').classList.add('gone');
    audio.init(); audio.ambience(); audio.load(CONFIG.assets.music);   // user gesture unlocks audio
    if (video) video.source.play().catch(() => {});
    gsap.to(['#skip', '#mute'], { autoAlpha: 1, duration: 1, delay: 1.5 });
    $('#skip').addEventListener('click', skip, { once: true });
    $('#mute').addEventListener('click', () => {
      audio.mute(!audio.muted);
      $('#mute').setAttribute('aria-pressed', String(audio.muted));
      $('#mute').textContent = audio.muted ? 'Sound off' : 'Sound on';
    });
    journey();
  }

  // Expanding ink ring at an earbud — the "plug-in" visual
  function ring(pt, delay) {
    const g = new PIXI.Graphics().lineStyle({ width: W * 0.0015, color: 0x000000 }).drawCircle(0, 0, W * 0.012);
    g.position.set(pt.x * W, pt.y * H); fx.addChild(g);
    gsap.to(g.scale, { x: 9, y: 9, duration: 1.1, delay, ease: 'power3.out' });
    gsap.to(g, { alpha: 0, duration: 1.1, delay, ease: 'power2.in', onComplete: () => g.destroy() });
  }

  // 42 s: chest rotation freezes, static cuts, the music takes over
  function snap() {
    audio.snap(); audio.drop();
    Object.assign(S, { chInt: 0.06, chSpeed: 0.15, shake: 0, bgSpeed: 0.06, bgAmp: 0.006 });  // chest stops, background crawls
    gsap.fromTo('#flash', { opacity: 0.9 }, { opacity: 0, duration: 0.7, ease: 'power3.out' });
    gsap.fromTo(cam, { kick: 0.22 }, { kick: 0, duration: 0.9, ease: 'elastic.out(1,0.35)' });
    ring(CONFIG.pts.earR, 0); ring(CONFIG.pts.earL, 0.22);
  }

  // Show the ink world on its paper (used at the 10–15 s reveal and by Skip)
  function reveal() {
    world.visible = true;
  }

  // Timings follow STORYBOARD_TIMELINE.md; positions are seconds after the tap
  function journey() {
    const p = CONFIG.pts;
    tl = gsap.timeline()
      /* Overwhelm (0–15 s): close on the neon topography, pull back, then reveal the ink artwork */
      .call(() => say('The noise closes in.'), null, 0.6)
      .to(intro, { zoom: 1.35, duration: 5, ease: 'sine.inOut' }, 0)
      .to(intro, { zoom: 1, duration: 5, ease: 'power2.in' }, 5)
      .call(() => audio.intensify(5, 0.15), null, 5)
      .call(() => say(''), null, 8)
      .call(() => { reveal(); Object.assign(cam, { x: 0.5, y: 0.5, zoom: 1 });
                    Object.assign(S, { chInt: 0.05, chSpeed: 0.6, bgSpeed: 1.8, bgAmp: 0.02, shake: 0 }); }, null, 10)
      .call(() => audio.intensify(5, 0.4), null, 10)
      .to(intro, { alpha: 0, duration: 4.5, ease: 'sine.inOut' }, 10)

      /* Internal Agony (15–30 s): paper tone, push into the chest, scribbles agitate to a peak */
      .addLabel('agony', 15)
      .call(() => { say('The noise turns inward.'); audio.intensify(15, 1); }, null, 'agony')
      .to(cam, { x: p.chest.x, y: p.chest.y, zoom: 2.4, duration: 10, ease: 'power2.inOut' }, 'agony')
      .to(S, { chInt: 0.6, chSpeed: 1.5, shake: 3, duration: 5, ease: 'power1.in' }, 'agony+5')
      .call(() => say('Every thought circles.'), null, 'agony+10')
      .to(cam, { zoom: 3.6, duration: 5, ease: 'power2.in' }, 'agony+10')
      .to(S, { chInt: 1, chSpeed: 2, shake: 8, duration: 5, ease: 'power1.in' }, 'agony+10')

      /* Escape (30–45 s): follow the wire up to the earpiece, snap, pan to the head, start the pull-out */
      .addLabel('escape', 30)
      .call(() => { say('Follow the wire.'); audio.fadeIn(12, 0.35); }, null, 'escape')
      .to(cam, { x: 0.5, y: 0.66, zoom: 2.6, duration: 5, ease: 'power2.inOut' }, 'escape')
      .to(cam, { x: p.earR.x, y: p.earR.y, zoom: 5, duration: 5, ease: 'power3.inOut' }, 'escape+5')
      .call(() => say(''), null, 'escape+6')
      .call(() => audio.fadeIn(2, 0.55), null, 'escape+10')
      .to(cam, { zoom: 5.4, duration: 2, ease: 'sine.inOut' }, 'escape+10')
      .to(S, { shake: 12, duration: 2 }, 'escape+10')
      .call(snap, null, 'escape+12')
      .call(() => say('Click. Clarity.'), null, 'escape+12.2')
      .to(cam, { x: 0.5, y: 0.32, zoom: 3, duration: 1.8, ease: 'sine.inOut' }, 'escape+12.2')
      .to(S, { react: 1, duration: 4, ease: 'sine.inOut' }, 'escape+12.5')

      /* Sanctuary (45 s → ∞): settle on the full artwork; ambient loops keep running in the ticker */
      .addLabel('sanctuary', 45)
      .to(cam, { x: 0.5, y: 0.5, zoom: 1, duration: 5, ease: 'power3.inOut' }, 'sanctuary-1')
      .call(() => say('A breath. A beat. A way through.'), null, 'sanctuary')
      .to(S, { bgSpeed: 0.35, bgAmp: 0.007, duration: 5 }, 'sanctuary')
      .to(S, { parallax: 1, duration: 3 }, 'sanctuary+4')
      .call(settled, null, 'sanctuary+4')
      .call(() => say(''), null, 'sanctuary+9');
  }

  function settled() { gsap.to('#skip', { autoAlpha: 0, duration: 0.6 }); }

  // Jump straight to the sanctuary from anywhere in the cinematic
  function skip() {
    if (!tl) return;
    tl.kill(); tl = null;
    gsap.killTweensOf([cam, S, intro]);
    reveal(); settled(); say('');
    audio.snap(true); audio.drop();
    gsap.to(intro, { alpha: 0, duration: 0.8 });
    Object.assign(S, { chInt: 0.06, chSpeed: 0.15, shake: 0, bgAmp: 0.007 });
    gsap.to(S, { bgSpeed: 0.35, react: 1, parallax: 1, duration: 2 });
    gsap.to(cam, { x: 0.5, y: 0.5, zoom: 1, kick: 0, duration: 1.6, ease: 'power3.inOut' });
  }

  boot().catch((e) => { console.error(e); $('#status').textContent = 'WebGL failed to start: ' + e.message; });
})();
