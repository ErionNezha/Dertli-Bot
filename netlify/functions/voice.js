// ============================================================
// Netlify Function: "voice" — Dertli Bot (Text-to-Speech)
// Shtresë zëri mbi bisedën ekzistuese. chat.js NUK preket.
//
// POST /.netlify/functions/voice   { "text": "..." }
//   → audio/mpeg (mp3)
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
const VOICE = "nova";

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
  if (!text) {
    return json(400, { error: "S'ka tekst për t'u lexuar." });
  }

  const url =
    "https://text.pollinations.ai/" +
    encodeURIComponent(text) +
    "?model=openai-audio&voice=" +
    VOICE;

  let resp;
  try {
    resp = await fetchWithTimeout(url, {}, TTS_TIMEOUT_MS);
  } catch (e) {
    return json(502, { error: "Zëri s'mundi të gjenerohet tani. Provo përsëri pas pak. 🙏" });
  }
  if (!resp.ok) {
    return json(502, { error: "Zëri s'mundi të gjenerohet tani. Provo përsëri pas pak. 🙏" });
  }

  const buf = Buffer.from(await resp.arrayBuffer());
  if (!buf.length) {
    return json(502, { error: "Zëri s'mundi të gjenerohet tani. Provo përsëri pas pak. 🙏" });
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
    body: buf.toString("base64"),
    isBase64Encoded: true,
  };
};
