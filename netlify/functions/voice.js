// ============================================================
// Netlify Function: "voice" — Dertli Bot (Text-to-Speech)
// Shtresë zëri mbi bisedën ekzistuese. chat.js NUK preket.
//
// POST /.netlify/functions/voice   { "text": "..." }
//   → audio/wav (24 kHz mono)
//
// Mbrojtjet (njësoj si chat.js):
//   - origin check: vetëm dertlibot.netlify.app (+ ALLOWED_ORIGINS)
//   - rate limit 3-shkallësh: 30 kërkesa/orë → 429;
//     burst 12/2min → lockdown 12h; 8×429 të injoruara → lockdown 6h
//   - teksti pritet në 600 shenja (mbron kuotën e ofruesit)
// LIGJ BLIND: boti nuk zbulon KURRË cili ofrues e gjeneroi zërin.
// ============================================================

const TTS_TIMEOUT_MS = 25000;
const MAX_TEXT_LEN = 600;
const TTS_MODEL = "gemini-3.8-flash-tts";
const TTS_MODEL_FALLBACK = "gemini-2.5-flash-preview-tts";
const DEFAULT_VOICE = "Charon"; // zë burri, i thellë — përfaqëson Dertlin
// Zërat e lejuar (30 zërat e Gemini TTS) — vlera nga klienti validohet.
const ALLOWED_VOICES = [
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
  "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
  "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
  "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
];

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

// ---- Origin check (kopje e rregullit të chat.js) ----
function originAllowed(event) {
  const h = event.headers || {};
  const raw = String(h.origin || h.Origin || h.referer || h.Referer || "");
  if (!raw) return true;
  let host = "";
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch (e) {
    return false;
  }
  const extra = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return (
    host === "dertlibot.netlify.app" ||
    host.endsWith("--dertlibot.netlify.app") ||
    extra.indexOf(host) !== -1
  );
}

function clientIp(event) {
  const h = event.headers || {};
  const fwd = h["x-forwarded-for"] || h["X-Forwarded-For"] || "";
  if (fwd) return String(fwd).split(",")[0].trim();
  return String(
    h["client-ip"] || h["x-nf-client-connection-ip"] || "unknown"
  ).trim();
}

// ---- Rate limit 3-shkallësh (njësoj si chat.js) ----
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const BURST_MAX = 12;
const BURST_WINDOW_MS = 2 * 60 * 1000;
const ABUSE_429_MAX = 8;
const LOCKDOWN_MS = 6 * 60 * 60 * 1000;
const LOCKDOWN_BURST_MS = 12 * 60 * 60 * 1000;
const rateBuckets = new Map();
const abuseHits = new Map();
const lockdowns = new Map();

function checkAbuse(ip) {
  const now = Date.now();
  const until = lockdowns.get(ip) || 0;
  if (until > now) return "lockdown";
  if (until) lockdowns.delete(ip);

  let reqs = rateBuckets.get(ip);
  if (!reqs) {
    reqs = [];
    rateBuckets.set(ip, reqs);
  }
  while (reqs.length && now - reqs[0] > RATE_LIMIT_WINDOW_MS) reqs.shift();

  const burstCut = now - BURST_WINDOW_MS;
  let burst = 0;
  for (let i = reqs.length - 1; i >= 0 && reqs[i] >= burstCut; i--) burst++;
  if (burst >= BURST_MAX) {
    lockdowns.set(ip, now + LOCKDOWN_BURST_MS);
    return "lockdown";
  }

  if (reqs.length >= RATE_LIMIT_MAX) {
    let hits = abuseHits.get(ip);
    if (!hits) {
      hits = [];
      abuseHits.set(ip, hits);
    }
    while (hits.length && now - hits[0] > RATE_LIMIT_WINDOW_MS) hits.shift();
    hits.push(now);
    if (hits.length >= ABUSE_429_MAX) {
      lockdowns.set(ip, now + LOCKDOWN_MS);
      return "lockdown";
    }
    return "limited";
  }

  reqs.push(now);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (!v.length || now - v[v.length - 1] > RATE_LIMIT_WINDOW_MS)
        rateBuckets.delete(k);
      if (rateBuckets.size <= 4000) break;
    }
  }
  return "ok";
}

// ---- Pastrimi i tekstit për lexim me zë ----
function cleanForSpeech(text) {
  let t = String(text || "");
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "$1"); // foto markdown → përshkrimi
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1"); // link → teksti
  t = t.replace(/\*\*(.+?)\*\*/g, "$1"); // bold → tekst
  t = t.replace(/https?:\/\/\S+/g, " "); // URL-të s'lexohen
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " "); // emoji
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, MAX_TEXT_LEN);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: {}, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodë e palejuar." });
  }
  if (!originAllowed(event)) {
    return json(403, { error: "Nuk lejohet." });
  }

  const ip = clientIp(event);
  const abuse = checkAbuse(ip);
  if (abuse === "lockdown") {
    return json(429, {
      error: "Ke kaluar kufirin e përkohshëm të zërit. Provo përsëri pas disa orësh. 🙏",
    });
  }
  if (abuse === "limited") {
    return json(429, {
      error: "Shumë kërkesa për zë. Pusho pak dhe provo përsëri. 🙏",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Kërkesë e pavlefshme." });
  }

  const text = cleanForSpeech(body.text);
  if (body.action === "transcribe") {
    return await handleTranscribe(body);
  }
  if (!text) {
    return json(400, { error: "S'ka tekst për t'u lexuar." });
  }
  const voice = ALLOWED_VOICES.indexOf(String(body.voice || "")) !== -1
    ? String(body.voice)
    : DEFAULT_VOICE;

  const keys = [
    process.env.GEMINI_KEY_2,
    process.env.FALLBACK_KEY,
  ].filter(Boolean);
  if (!keys.length) {
    return json(502, { error: "Zëri s'mundi të gjenerohet tani. Provo përsëri pas pak. 🙏" });
  }

  const ttsError = () =>
    json(502, { error: "Zëri s'mundi të gjenerohet tani. Provo përsëri pas pak. 🙏" });

  for (const key of keys) {
    // Rruga 1: Interactions API → kthen WAV të plotë.
    try {
      const wav = await ttsInteractions(key, text, voice);
      if (wav && wav.length) return audioResponse(wav);
    } catch (e) { /* provo rrugën tjetër */ }
    // Rruga 2 (rezervë): generateContent klasik → PCM → mbështjellë në WAV.
    try {
      const wav = await ttsGenerateContent(key, text, voice);
      if (wav && wav.length) return audioResponse(wav);
    } catch (e) { /* provo çelësin tjetër */ }
  }
  return ttsError();
};

// ---- Transkriptim zë→tekst (Whisper përmes Groq) ----
async function handleTranscribe(body) {
  const b64 = String(body.audio || "");
  if (!b64 || b64.length > 8 * 1024 * 1024) {
    return json(400, { error: "Audio e pavlefshme." });
  }
  const groqKey = process.env.GROQ_KEY;
  if (!groqKey) {
    return json(502, { error: "Shërbimi i zërit s'është gati. Provo përsëri pas pak. 🙏" });
  }
  const mime = String(body.mime || "audio/webm");
  const ext = mime.indexOf("mp4") !== -1 ? "mp4" : "webm";
  const buf = Buffer.from(b64, "base64");

  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: mime }), "voice." + ext);
  fd.append("model", "whisper-large-v3-turbo");
  fd.append("language", "sq");
  fd.append("response_format", "json");

  let resp;
  const dbg = {};
  try {
    resp = await fetchWithTimeout(
      "https://api.groq.com/openai/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + groqKey },
        body: fd,
      },
      TTS_TIMEOUT_MS
    );
  } catch (e) {
    return json(502, { error: "S'munda ta kuptoj zërin. Provo përsëri. 🙏", debug: { where: "fetch", msg: String(e && e.message || e).slice(0, 120) } });
  }
  if (!resp.ok) {
    let b = "";
    try { b = (await resp.text()).slice(0, 200); } catch (e) {}
    return json(502, { error: "S'munda ta kuptoj zërin. Provo përsëri. 🙏", debug: { where: "groq", status: resp.status, body: b } });
  }
  let data;
  try {
    data = await resp.json();
  } catch (e) {
    return json(502, { error: "S'munda ta kuptoj zërin. Provo përsëri. 🙏" });
  }
  const text = String(data.text || "").trim();
  if (!text) {
    return json(502, { error: "S'munda ta kuptoj zërin. Provo përsëri. 🙏" });
  }
  return json(200, { text: text });
}

function audioResponse(wavBuf) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
    body: wavBuf.toString("base64"),
    isBase64Encoded: true,
  };
}

async function ttsInteractions(key, text, voice) {
  const resp = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: [
          {
            type: "user_input",
            content: [
              {
                type: "text",
                text: text,
                annotations: [
                  { type: "speech_metadata", style: "warm, friendly, natural" },
                ],
              },
            ],
          },
        ],
        response_format: { type: "audio", mime_type: "audio/wav", sample_rate: 24000 },
        generation_config: { speech_config: [{ voice: voice }] },
      }),
    },
    TTS_TIMEOUT_MS
  );
  if (!resp.ok) throw new Error("interactions http " + resp.status);
  const data = await resp.json();
  const steps = data.steps || [];
  for (const s of steps) {
    if (s.type !== "model_output" || !Array.isArray(s.content)) continue;
    for (const c of s.content) {
      if (c.type === "audio" && c.data) return Buffer.from(c.data, "base64");
    }
  }
  throw new Error("no audio in interactions response");
}

async function ttsGenerateContent(key, text, voice) {
  const resp = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      TTS_MODEL_FALLBACK +
      ":generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      }),
    },
    TTS_TIMEOUT_MS
  );
  if (!resp.ok) throw new Error("generateContent http " + resp.status);
  const data = await resp.json();
  const parts =
    (((data.candidates || [])[0] || {}).content || {}).parts || [];
  for (const p of parts) {
    const b64 = p.inlineData && p.inlineData.data;
    if (b64) return pcmToWav(Buffer.from(b64, "base64"), 24000);
  }
  throw new Error("no audio in generateContent response");
}

// PCM 16-bit mono → WAV (44-byte header).
function pcmToWav(pcm, sampleRate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
