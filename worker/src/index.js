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

    if (url.pathname === '/api/grade-translation') {
      if (request.method !== 'POST') return cors(json({ error: 'method_not_allowed' }, 405), env);
      return cors(await gradeTranslation(request, env), env);
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

// Grade a spoken Chinese translation.
//
// Character overlap alone cannot say WHY an answer is weak — it cannot tell a
// missing clause from a wrong one, and it marks 「很有天赋」 down against
// 「非常有天赋」 for no real reason. A language model can, and it writes its
// answer in Simplified Chinese, which also ends the losing game of hand-
// maintaining a Traditional-to-Simplified table.
const GRADE_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';

async function gradeTranslation(request, env) {
  const url = new URL(request.url);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }
  const en = String(body.en || '').slice(0, 600);
  const ref = String(body.reference || '').slice(0, 600);
  const said = String(body.spoken || '').slice(0, 600);
  if (!en || !said) return json({ error: 'missing_fields' }, 400);

  const prompt = [
    '你是小学英语老师，正在批改学生的口头翻译。',
    '英文原句：' + en,
    '参考译文：' + ref,
    '学生说的：' + said,
    '',
    '评分要求：',
    '1. 只看意思是否传达到位，用词和句式与参考不同不算错。',
    '2. 学生是小学生，语气要鼓励，但错误要指出来。',
    '3. 所有中文一律用简体。',
    '4. 学生是口头作答，文字由语音识别转写。繁体字、同音字、标点差异都是',
    '   转写造成的，不是学生的错，不要当作翻译错误。',
    '',
    '只输出 JSON，不要任何其他文字：',
    '{"score":0-100的整数,"understood":true或false,',
    '"missing":["漏掉的关键信息"],"errors":["译错的地方"],',
    '"better":"更自然的说法","said":"学生说的话，转成简体"}',
  ].join('\n');

  let out;
  try {
    out = await env.AI.run(GRADE_MODEL, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.2,
    });
  } catch (e) {
    return json({ error: 'grade_failed', detail: String(e && e.message || e) }, 502);
  }

  // Reasoning models put the answer in different places and can spend the
  // whole token budget on thinking; surface the shape when nothing parses.
  // choices[] first: on this model `response` is an OBJECT, so reading it
  // first turned the answer into the string "[object Object]".
  let raw = '';
  if (typeof out === 'string') raw = out;
  else if (out) {
    const c = out.choices && out.choices[0];
    const fromChoice = c && ((c.message && c.message.content) || c.text);
    raw = fromChoice || (typeof out.response === 'string' ? out.response : '')
       || (typeof out.result === 'string' ? out.result : '');
  }
  raw = String(raw || '');
  if (url.searchParams.get('debug') === '1') {
    return json({ shape: out && typeof out === 'object' ? Object.keys(out) : typeof out,
                  rawLen: raw.length, sample: raw.slice(0, 400), full: out });
  }
  // Models wrap JSON in prose or fences often enough that the client should
  // never have to care; pull out the object here.
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return json({ error: 'unparsable', raw: raw.slice(0, 300) }, 502);
  let parsed;
  try { parsed = JSON.parse(m[0]); } catch (e) { return json({ error: 'unparsable', raw: m[0].slice(0, 300) }, 502); }

  return json({
    score: Math.max(0, Math.min(100, parseInt(parsed.score, 10) || 0)),
    understood: !!parsed.understood,
    missing: Array.isArray(parsed.missing) ? parsed.missing.slice(0, 4) : [],
    errors: Array.isArray(parsed.errors) ? parsed.errors.slice(0, 4) : [],
    better: String(parsed.better || '').slice(0, 200),
    said: String(parsed.said || said).slice(0, 300),
  });
}

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
