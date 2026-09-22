// ============================================================
//  Netlify Function: "chat"
//  Ky kod punon në serverin e Netlify, jo në shfletues.
//  Çelësi API mbahet i FSHEHUR në Environment Variables:
//    UPSTREAM_URL   -> https://codecraftapi.com/v1/chat/completions
//    UPSTREAM_KEY   -> çelësi yt API (fillon me cc_...; i fshehur, nuk duket në kod)
//    MODEL          -> emri i modelit (opsionale)
//    SYSTEM_PROMPT  -> personaliteti i bot-it (opsionale)
//    FALLBACK_URL   -> URL e API-së rezervë FALAS (opsionale,
//                     parazgjedhja: https://text.pollinations.ai/openai)
//    FALLBACK_MODEL -> modeli i API-së rezervë (opsionale, parazgjedhja: openai)
//    FALLBACK_KEY   -> çelësi i API-së rezervë (opsionale; bosh = pa header Authorization)
// ============================================================

const DEFAULT_SYSTEM =
  "Je një asistent virtual miqësor dhe i dobishëm. Përgjigju gjithmonë në gjuhën shqipe, qartë dhe shkurt. Nëse nuk e di diçka, thuaje sinqerisht.";

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Vetëm kërkesa POST lejohet." });
  }

  const UPSTREAM_URL = (process.env.UPSTREAM_URL || "").trim();
  const UPSTREAM_KEY = (process.env.UPSTREAM_KEY || "").trim();
  const MODEL = (process.env.MODEL || "").trim() || "claude-opus-4.8";

  // API rezervë FALAS: përdoret automatikisht vetëm kur primari dështon
  // (kredite të harxhuara, çelës i pavlefshëm, rate limit ose problem rrjeti).
  const FALLBACK_URL =
    (process.env.FALLBACK_URL || "").trim() ||
    "https://text.pollinations.ai/openai";
  const FALLBACK_MODEL = (process.env.FALLBACK_MODEL || "").trim() || "openai";
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

  try {
    let res;
    let primaryError = false;

    try {
      res = await fetch(UPSTREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + UPSTREAM_KEY,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: systemPrompt }].concat(messages),
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });
    } catch (e) {
      // Dështim rrjeti te primari -> provo fallback-in.
      primaryError = true;
    }

    if (
      primaryError ||
      (res && (res.status === 401 || res.status === 402 || res.status === 429))
    ) {
      // Primari dështoi (kredite të harxhuara / çelës i pavlefshëm /
      // rate limit / problem rrjeti) -> provo API-në rezervë FALAS
      // me të njëjtin trup kërkese, por me modelin e fallback-it.
      const fallbackHeaders = { "Content-Type": "application/json" };
      if (FALLBACK_KEY) {
        fallbackHeaders.Authorization = "Bearer " + FALLBACK_KEY;
      }

      res = await fetch(FALLBACK_URL, {
        method: "POST",
        headers: fallbackHeaders,
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          messages: [{ role: "system", content: systemPrompt }].concat(messages),
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (data && data.error && data.error.message) ||
        "Gabim " + res.status + " nga API-ja.";
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
