/**
 * Amy 英语打卡 — API Worker
 *
 * Today it does one job: turn a child's 16kHz mono WAV into text using
 * Workers AI Whisper, so the app stops depending on the browser's
 * SpeechRecognition (Chrome-only, and it streams audio to Google, which is
 * unreachable from the mainland).
 *
 * The client treats this as best-effort — it has already stored the audio
 * locally before calling — so every failure path here returns quickly and
 * says what happened rather than hanging.
 */

const MODEL = '@cf/openai/whisper';

// A read-along is a few seconds of 16kHz mono 16-bit PCM: ~32KB/second.
// 2MB is a minute of audio, far past anything legitimate.
const MAX_BYTES = 2 * 1024 * 1024;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), env);

    if (url.pathname === '/api/health') {
      return cors(json({ ok: true }), env);
    }

    if (url.pathname === '/api/tts') {
      return cors(await tts(request, env, ctx), env);
    }

    if (url.pathname === '/api/transcribe') {
      if (request.method !== 'POST') return cors(json({ error: 'method_not_allowed' }, 405), env);
      return cors(await transcribe(request, env), env);
    }

    return cors(json({ error: 'not_found' }, 404), env);
  },
};

// Text-to-speech from our own origin.
//
// The app used to point <audio> at 有道/百度 TTS URLs. Those are third-party
// cross-origin resources: they work in desktop Chrome and fail in restricted
// mobile browsers (Xiaomi's built-in browser plays nothing). Serving the audio
// from the same origin as the page removes that whole class of problem.
//
// Responses are cached — 45 children read the same sentences over and over,
// so almost every request after the first is a cache hit and costs nothing.
const TTS_MODEL = '@cf/deepgram/aura-2-en';
const TTS_MAX_CHARS = 900;

async function tts(request, env, ctx) {
  const url = new URL(request.url);
  const text = (url.searchParams.get('text') || '').trim();
  if (!text) return json({ error: 'no_text' }, 400);
  if (text.length > TTS_MAX_CHARS) return json({ error: 'too_long' }, 413);

  const cacheKey = new Request(url.origin + '/api/tts?text=' + encodeURIComponent(text), { method: 'GET' });
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let audio;
  try {
    audio = await env.AI.run(TTS_MODEL, { text: text });
  } catch (e) {
    return json({ error: 'tts_failed', detail: String(e && e.message || e) }, 502);
  }

  // The binding returns either a ReadableStream or an object holding base64.
  let body = audio;
  if (audio && typeof audio === 'object' && !(audio instanceof ReadableStream)) {
    if (audio.audio) {
      const bin = atob(audio.audio);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      body = bytes;
    }
  }

  const res = new Response(body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

async function transcribe(request, env) {
  // Reject oversized bodies before buffering them.
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BYTES) return json({ error: 'too_large' }, 413);

  let bytes;
  try {
    const buf = await request.arrayBuffer();
    if (buf.byteLength === 0) return json({ error: 'empty_audio' }, 400);
    if (buf.byteLength > MAX_BYTES) return json({ error: 'too_large' }, 413);
    bytes = new Uint8Array(buf);
  } catch (e) {
    return json({ error: 'bad_body' }, 400);
  }

  // Letters and words need different handling: Whisper's language model
  // happily reassembles spelled letters into a word ("K N O W L E D G E" came
  // back as "KNOW LEDG"), so a spelling task gets a prompt that tells it what
  // it is listening to. ?mode= lets the client pick; ?model= is for A/B tests.
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'sentence';
  const model = url.searchParams.get('model') === 'turbo'
    ? '@cf/openai/whisper-large-v3-turbo' : MODEL;

  const input = { audio: [...bytes] };
  // NOTE: @cf/openai/whisper accepts only `audio` — language and
  // initial_prompt are ignored (tested: a Simplified-Chinese prompt still
  // returned Traditional). Chinese is normalised on the client instead.
  if (model !== MODEL) {
    input.task = 'transcribe';
    input.language = 'en';
    if (mode === 'letter') {
      input.initial_prompt = 'The speaker is reading single English alphabet letters aloud, one at a time.';
    }
  }

  try {
    const out = await env.AI.run(model, input);
    return json({
      model: model,
      text: (out && out.text ? out.text : '').trim(),
      words: (out && out.words) || null,
      wordCount: (out && out.word_count) || null,
    });
  } catch (e) {
    // Model errors and quota exhaustion both land here. The client falls back
    // to self-assessment and queues the clip for a retry.
    return json({ error: 'transcribe_failed', detail: String(e && e.message || e) }, 502);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// The app is served from the same origin in production, so CORS only matters
// for local development against `wrangler dev`.
function cors(res, env) {
  const allowed = (env && env.ALLOWED_ORIGIN) || '*';
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', allowed);
  h.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  h.set('Access-Control-Max-Age', '86400');
  return new Response(res.body, { status: res.status, headers: h });
}
