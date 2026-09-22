// ============================================================
//  Netlify Function: "chat"
//  Ky kod punon në serverin e Netlify, jo në shfletues.
//  Çelësi API mbahet i FSHEHUR në Environment Variables:
//    UPSTREAM_URL   -> https://codecraftapi.com/v1/chat/completions
//    UPSTREAM_KEY   -> çelësi yt API (fillon me cc_...; i fshehur, nuk duket në kod)
//    MODEL          -> emri i modelit (opsionale)
//    SYSTEM_PROMPT  -> personaliteti i bot-it (opsionale)
//    FALLBACK_URL   -> URL e API-së rezervë (parazgjedhja: Google Gemini)
//    FALLBACK_MODEL -> modeli i API-së rezervë (parazgjedhja: gemini-3.6-flash)
//    FALLBACK_KEY   -> çelësi i API-së rezervë (opsionale; bosh = pa header Authorization)
//
//  LOGJIKA: provo primaren me timeout 10s. Nëse dështon (timeout,
//  problem rrjeti, 401/402/403/429 ose 5xx) -> kalo automatikisht
//  te fallback-i me timeout 18s. Totali maksimal 28s < limiti 30s i Netlify.
// ============================================================

const DEFAULT_SYSTEM =
  "Je një asistent virtual miqësor dhe i dobishëm. Përgjigju gjithmonë në gjuhën shqipe, qartë dhe shkurt. Nëse nuk e di diçka, thuaje sinqerisht.";

// Timeout-et (në milisekonda) — mbajnë funksionin brenda limitit 30s të Netlify.
const PRIMARY_TIMEOUT_MS = 10000;
const FALLBACK_TIMEOUT_MS = 18000;

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

// fetch me timeout: nëse serveri "ngrin" pa u përgjigjur, e ndërpresim
// dhe kalojmë te opsioni tjetër në vend që Netlify të na mbyllë pas 30s.
async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

// Mbrojtje nga spam-i: max 30 kërkesa/orë për IP (mbron kuotën falas të Gemini-t).
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateBuckets = new Map();

function clientIp(event) {
  const h = event.headers || {};
  const fwd = h["x-forwarded-for"] || h["X-Forwarded-For"] || "";
  if (fwd) return String(fwd).split(",")[0].trim();
  return String(
    h["client-ip"] || h["x-nf-client-connection-ip"] || "unknown"
  ).trim();
}

function isRateLimited(ip) {
  const now = Date.now();
  let arr = rateBuckets.get(ip);
  if (!arr) {
    arr = [];
    rateBuckets.set(ip, arr);
  }
  while (arr.length && now - arr[0] > RATE_LIMIT_WINDOW_MS) arr.shift();
  if (arr.length >= RATE_LIMIT_MAX) return true;
  arr.push(now);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (!v.length || now - v[v.length - 1] > RATE_LIMIT_WINDOW_MS)
        rateBuckets.delete(k);
      if (rateBuckets.size <= 4000) break;
    }
  }
  return false;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Vetëm kërkesa POST lejohet." });
  }

  if (isRateLimited(clientIp(event))) {
    return json(429, {
      error:
        "Ke dërguar shumë mesazhe në një kohë të shkurtër. " +
        "Pusho pak dhe provo përsëri pas disa minutash. ⏳",
    });
  }

  const UPSTREAM_URL = (process.env.UPSTREAM_URL || "").trim();
  const UPSTREAM_KEY = (process.env.UPSTREAM_KEY || "").trim();
  const MODEL = (process.env.MODEL || "").trim() || "claude-opus-4.8";

  // API rezervë: përdoret automatikisht vetëm kur primari dështon.
  const FALLBACK_URL =
    (process.env.FALLBACK_URL || "").trim() ||
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const FALLBACK_MODEL =
    (process.env.FALLBACK_MODEL || "").trim() || "gemini-3.6-flash";
  const FALLBACK_KEY = (process.env.FALLBACK_KEY || "").trim();

  if (!UPSTREAM_URL || !UPSTREAM_KEY) {
    return json(500, {
      error: "NOT_CONFIGURED",
      message:
        "Chatbot-i nuk është konfiguruar ende. Pronari i faqes duhet të vendosë " +
        "UPSTREAM_URL dhe UPSTREAM_KEY te Netlify → Site settings → Environment variables, " +
        "pastaj të bëjë një deploy të ri (Deploys → Trigger deploy).",
    });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Kërkesë e pavlefshme." });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const systemPrompt = String(
    body.systemPrompt || process.env.SYSTEM_PROMPT || DEFAULT_SYSTEM
  ).trim();

  const requestBody = (model) =>
    JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemPrompt }].concat(messages),
      temperature: 0.7,
      max_tokens: 1000,
    });

  try {
    let res = null;
    let primaryFailed = false;

    try {
      res = await fetchWithTimeout(
        UPSTREAM_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + UPSTREAM_KEY,
          },
          body: requestBody(MODEL),
        },
        PRIMARY_TIMEOUT_MS
      );
    } catch (e) {
      // Timeout ose dështim rrjeti te primari -> provo fallback-in.
      primaryFailed = true;
    }

    const primaryStatus = res ? res.status : 0;
    const primaryDown =
      primaryFailed ||
      primaryStatus === 401 ||
      primaryStatus === 402 ||
      primaryStatus === 403 ||
      primaryStatus === 429 ||
      primaryStatus === 500 ||
      primaryStatus === 502 ||
      primaryStatus === 503 ||
      primaryStatus === 504;

    if (primaryDown) {
      // Primari dështoi -> provo API-në rezervë me të njëjtin trup kërkese.
      const fallbackHeaders = { "Content-Type": "application/json" };
      if (FALLBACK_KEY) {
        fallbackHeaders.Authorization = "Bearer " + FALLBACK_KEY;
      }

      res = await fetchWithTimeout(
        FALLBACK_URL,
        {
          method: "POST",
          headers: fallbackHeaders,
          body: requestBody(FALLBACK_MODEL),
        },
        FALLBACK_TIMEOUT_MS
      );
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Google kthen gabimin ndonjëherë si array — e formatojmë bukur.
      let msg = "Gabim " + res.status + " nga API-ja.";
      const errObj = data && data.error;
      if (errObj) {
        if (typeof errObj.message === "string" && errObj.message) {
          msg = errObj.message;
        } else if (Array.isArray(errObj) && errObj.length) {
          msg = errObj
            .map((x) => (x && (x.message || x.code)) || "")
            .filter(Boolean)
            .join("; ");
          if (!msg) msg = "Gabim " + res.status + " nga API-ja.";
        }
      }
      return json(res.status, { error: msg });
    }

    const reply =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? String(data.choices[0].message.content || "").trim()
        : "";

    if (!reply) return json(502, { error: "API-ja nuk ktheu përgjigje." });
    return json(200, { reply: reply });
  } catch (err) {
    return json(500, { error: "Problem me lidhjen me API-në: " + err.message });
  }
};
