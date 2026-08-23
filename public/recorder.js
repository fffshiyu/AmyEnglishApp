/* eslint-disable */
// ============================================================================
// Recorder — microphone capture that always produces 16kHz mono WAV.
//
// Why not MediaRecorder: it hands back whatever the browser prefers —
// webm/opus on Chrome, mp4/aac on Safari — so every consumer downstream has
// to deal with two formats, and neither is what speech services accept.
// Cloudflare Workers AI Whisper and Azure Pronunciation Assessment both want
// 16kHz mono PCM. Producing it at the source means no transcoding anywhere.
//
// Capture runs through Web Audio (AudioWorklet, ScriptProcessor as fallback),
// so the same code path also yields live volume for the level meter.
// ============================================================================

const Recorder = {
  TARGET_RATE: 16000,

  _workletUrl: null,
  _active: null,

  supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
              (window.AudioContext || window.webkitAudioContext));
  },

  // The worklet just forwards raw frames to the main thread. Built from a Blob
  // so the project keeps its "no build step, no extra files to deploy" shape.
  _workletModuleUrl() {
    if (this._workletUrl) return this._workletUrl;
    const src = `
      class PCMTap extends AudioWorkletProcessor {
        process(inputs) {
          const ch = inputs[0] && inputs[0][0];
          if (ch && ch.length) this.port.postMessage(ch.slice(0));
          return true;
        }
      }
      registerProcessor('pcm-tap', PCMTap);
    `;
    this._workletUrl = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
    return this._workletUrl;
  },

  // Build the AudioContext and compile the worklet ahead of time so even the
  // FIRST hold starts capturing immediately. Touches no microphone — the
  // stream is only requested in start().
  async warmUp() {
    if (!this.supported() || (this._ctx && this._workletReady)) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!this._ctx || this._ctx.state === 'closed') {
        try { this._ctx = new AC({ sampleRate: this.TARGET_RATE }); }
        catch (e) { this._ctx = new AC(); }
        this._workletReady = false;
      }
      if (this._ctx.audioWorklet && !this._workletReady) {
        await this._ctx.audioWorklet.addModule(this._workletModuleUrl());
        this._workletReady = true;
      }
    } catch (e) { /* falls back to building it on first use */ }
  },

  // Start capturing. Returns a handle; call stop() to get the WAV blob.
  // onLevel(0..1) fires continuously for the UI meter.
  async start(opts) {
    const options = opts || {};
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Reuse one AudioContext across takes. Building it and compiling the
    // worklet each time cost ~95ms, and a child who starts speaking the
    // instant they press lost that much off the front of the word.
    const AC = window.AudioContext || window.webkitAudioContext;
    let ctx = this._ctx;
    if (!ctx || ctx.state === 'closed') {
      try { ctx = new AC({ sampleRate: this.TARGET_RATE }); }
      catch (e) { ctx = new AC(); }
      this._ctx = ctx;
      this._workletReady = false;
    }
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) {} }

    const source = ctx.createMediaStreamSource(stream);
    const chunks = [];
    let peak = 0;

    const onFrame = (frame) => {
      chunks.push(frame);
      let localPeak = 0;
      for (let i = 0; i < frame.length; i++) {
        const v = frame[i] < 0 ? -frame[i] : frame[i];
        if (v > localPeak) localPeak = v;
      }
      if (localPeak > peak) peak = localPeak;
      if (options.onLevel) options.onLevel(localPeak);
    };

    let node = null, usingWorklet = false;
    if (ctx.audioWorklet) {
      try {
        if (!this._workletReady) {
          await ctx.audioWorklet.addModule(this._workletModuleUrl());
          this._workletReady = true;
        }
        node = new AudioWorkletNode(ctx, 'pcm-tap');
        node.port.onmessage = e => onFrame(e.data);
        usingWorklet = true;
      } catch (e) { node = null; }
    }
    if (!node) {
      // Deprecated but still the only option on older Safari/WebView.
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = e => onFrame(new Float32Array(e.inputBuffer.getChannelData(0)));
    }

    source.connect(node);
    // ScriptProcessor only runs while connected to a destination; a zero-gain
    // sink keeps it alive without the child hearing themselves.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    node.connect(sink);
    sink.connect(ctx.destination);

    this._active = { stream, ctx, source, node, sink, chunks, usingWorklet,
                     startedAt: Date.now(), peak: () => peak };
    return this._active;
  },

  recording() { return !!this._active; },

  // Stop and return { blob, duration, sampleRate, peak } — or null if the
  // capture produced no audio at all.
  async stop() {
    const a = this._active;
    this._active = null;
    if (!a) return null;

    try { a.node.disconnect(); } catch (e) {}
    try { a.source.disconnect(); } catch (e) {}
    try { a.sink.disconnect(); } catch (e) {}
    try { a.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    const srcRate = a.ctx.sampleRate;
    // Context stays open on purpose — closing it is what made the next take
    // slow to start. It holds no microphone; the stream tracks above do.


    const total = a.chunks.reduce((n, c) => n + c.length, 0);
    if (!total) return null;

    const flat = new Float32Array(total);
    let off = 0;
    a.chunks.forEach(c => { flat.set(c, off); off += c.length; });

    const pcm = srcRate === this.TARGET_RATE ? flat : this._resample(flat, srcRate, this.TARGET_RATE);
    return {
      blob: this._encodeWav(pcm, this.TARGET_RATE),
      // Raw samples come back too so several takes can be stitched into one
      // clip later — concatenating PCM is exact, concatenating encoded WAV
      // files is not (each carries its own 44-byte header).
      samples: pcm,
      duration: pcm.length / this.TARGET_RATE,
      sampleRate: this.TARGET_RATE,
      peak: a.peak(),
    };
  },

  // Whisper hallucinates on very short audio — a 0.21s "beautiful" came back
  // as "Thank you." (filler from its training data), which then scored 0. The
  // same clip padded out to 0.91s transcribed correctly. So anything sent for
  // recognition gets silence front and back, up to a floor of MIN_ASR_SECONDS.
  //
  // Padding is applied ONLY to the copy sent for recognition. The clip kept
  // for playback stays as recorded, or every joined take would carry dead air.
  MIN_ASR_SECONDS: 1.2,
  ASR_PAD_SECONDS: 0.35,

  padForAsr(samples) {
    if (!samples || !samples.length) return null;
    const pad = Math.round(this.ASR_PAD_SECONDS * this.TARGET_RATE);
    const floor = Math.round(this.MIN_ASR_SECONDS * this.TARGET_RATE);
    const needed = Math.max(floor - samples.length - pad * 2, 0);
    const tail = pad + needed;
    const out = new Float32Array(pad + samples.length + tail);
    out.set(samples, pad);                       // rest stays zero = silence
    return this._encodeWav(out, this.TARGET_RATE);
  },

  // Join takes into a single WAV, with a short gap so the words stay distinct.
  join(sampleChunks, gapSeconds) {
    const gap = Math.max(0, Math.round((gapSeconds === undefined ? 0.25 : gapSeconds) * this.TARGET_RATE));
    const parts = sampleChunks.filter(Boolean);
    if (!parts.length) return null;
    const total = parts.reduce((n, p) => n + p.length, 0) + gap * (parts.length - 1);
    const out = new Float32Array(total);
    let off = 0;
    parts.forEach((p, i) => {
      out.set(p, off);
      off += p.length + (i < parts.length - 1 ? gap : 0);
    });
    return { blob: this._encodeWav(out, this.TARGET_RATE), duration: total / this.TARGET_RATE };
  },

  // Linear interpolation is plenty for speech at these rates and keeps the
  // whole thing dependency-free.
  _resample(input, from, to) {
    if (from === to) return input;
    const ratio = from / to;
    const out = new Float32Array(Math.round(input.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const pos = i * ratio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, input.length - 1);
      const frac = pos - i0;
      out[i] = input[i0] * (1 - frac) + input[i1] * frac;
    }
    return out;
  },

  // 16-bit PCM WAV, mono. 44-byte canonical header.
  _encodeWav(samples, rate) {
    const bytesPerSample = 2;
    const buf = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buf);
    const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

    str(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    view.setUint32(16, 16, true);          // PCM chunk size
    view.setUint16(20, 1, true);           // format = PCM
    view.setUint16(22, 1, true);           // channels = mono
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * bytesPerSample, true);   // byte rate
    view.setUint16(32, bytesPerSample, true);          // block align
    view.setUint16(34, 16, true);          // bits per sample
    str(36, 'data');
    view.setUint32(40, samples.length * bytesPerSample, true);

    let off = 44;
    for (let i = 0; i < samples.length; i++, off += 2) {
      let s = samples[i];
      s = s < -1 ? -1 : s > 1 ? 1 : s;
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  },
};
