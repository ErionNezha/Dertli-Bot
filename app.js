(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var messagesEl = $("messages");
  var form = $("chat-form");
  var input = $("user-input");
  var sendBtn = $("send-btn");
  var suggestionsEl = $("suggestions");

  // --- Vlerësimet 👍/👎: ruhen VETËM lokalisht ---
  var feedbackStore = {};
  try { feedbackStore = JSON.parse(localStorage.getItem("dertli-feedback") || "{}"); } catch (e) { feedbackStore = {}; }
  var botMsgSeq = 0;

  function botAvatarHTML() { if (CONFIG.BOT_AVATAR_IMG) return '<img src="' + CONFIG.BOT_AVATAR_IMG + '" alt="Dertli Bot">'; return CONFIG.BOT_AVATAR; }

  // SHËNIM: shfletuesi flet VETËM me funksionin tonë në Netlify.
  // Çelësi API rri i fshehur në server — nuk dërgohet kurrë këtu.
  var ENDPOINT = "/.netlify/functions/chat";

  var history = [];
  var sending = false;

  function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }
    
    
    
  

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function formatText(text) {
    var html = escapeHtml(text);
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;display:block;margin:8px 0">');    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  function addMessage(text, who, cls, topic, lang) {
    var wrap = document.createElement("div");
    wrap.className = "message " + who + (cls ? " " + cls : "");
    if (who === "bot") {
      botMsgSeq++;
      var mid = "m" + Date.now() + "-" + botMsgSeq;
      wrap.innerHTML = '<div class="avatar">' + botAvatarHTML() + '</div><div class="bubble-wrap"><div class="bubble">' + formatText(text) + '</div><div class="msg-actions">'
        + '<button type="button" class="msg-act fb-up" title="Më pëlqeu">👍</button>'
        + '<button type="button" class="msg-act fb-down" title="Nuk më pëlqeu">👎</button>'
        + "</div></div>";
      wireMessageActions(wrap, mid);
      if (topic) addFollowups(wrap, topic, lang);
    } else {
      wrap.innerHTML = '<div class="bubble">' + formatText(text) + "</div>";
    }
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  // --- Njoftim për demo-n statike në GitHub Pages (nuk ka backend Netlify këtu) ---
  if (/github\.io$/.test(location.hostname)) {
    var note = document.createElement("div");
    note.setAttribute("style", "background:#fff8e1;color:#7a5c00;font-size:13px;text-align:center;padding:8px 12px;border-bottom:1px solid #f0dfae;");
    note.innerHTML = "👀 Kjo është demo statike — biseda live funksionon te " +
      '<a href="https://dertlibot.netlify.app" target="_blank" rel="noopener" style="color:#b3540a;font-weight:700;">dertlibot.netlify.app</a>';
    messagesEl.parentNode.insertBefore(note, messagesEl);
  }

  // --- Përshëndetja fillestare (typewriter — shkruhet shkronjë për shkronjë) ---
  function showWelcome() {
    messagesEl.innerHTML = "";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { addMessage(CONFIG.WELCOME_MESSAGE, "bot"); }
    else { typeMessage(CONFIG.WELCOME_MESSAGE); }
    input.focus();
  }

  function typeMessage(text) {
    botMsgSeq++;
    var mid = "m" + Date.now() + "-" + botMsgSeq;
    var wrap = document.createElement("div");
    wrap.className = "message bot";
    wrap.innerHTML = '<div class="avatar">' + botAvatarHTML() + '</div><div class="bubble-wrap"><div class="bubble">'
      + '<span class="tw-text"></span><span class="tw-caret"></span></div><div class="msg-actions">'
      + '<button type="button" class="msg-act fb-up" title="Më pëlqeu">👍</button>'
      + '<button type="button" class="msg-act fb-down" title="Nuk më pëlqeu">👎</button>'
      + "</div></div>";
    messagesEl.appendChild(wrap);
    wireMessageActions(wrap, mid);
    var twText = wrap.querySelector(".tw-text");
    var caret = wrap.querySelector(".tw-caret");
    var chars = Array.from(String(text));
    var i = 0, html = "";
    function esc(c) {
      return c.replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; });
    }
    var timer = setInterval(function () {
      if (i >= chars.length) {
        clearInterval(timer);
        if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
        scrollBottom();
        return;
      }
      var c = chars[i++];
      html += (c === "\n") ? "<br>" : esc(c);
      twText.innerHTML = html;
      scrollBottom();
    }, 22);
  }

  // --- Vlerësimi 👍/👎 (ruhet vetëm lokalisht) ---
  function wireMessageActions(wrap, mid) {
    var up = wrap.querySelector(".fb-up"), down = wrap.querySelector(".fb-down");
    function paint() {
      var v = feedbackStore[mid];
      if (up) up.classList.toggle("active", v === "up");
      if (down) down.classList.toggle("active", v === "down");
    }
    function vote(v) {
      feedbackStore[mid] = (feedbackStore[mid] === v) ? "" : v;
      try { localStorage.setItem("dertli-feedback", JSON.stringify(feedbackStore)); } catch (e) {}
      paint();
      // Numërohet edhe në server (për analitikën e pronarit) — pa kuotë, pa Turnstile.
      var nv = feedbackStore[mid];
      if (nv === "up" || nv === "down") {
        try {
          fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "rate", value: nv })
          }).catch(function () {});
        } catch (e) {}
      }
    }
    if (up) up.addEventListener("click", function () { vote("up"); });
    if (down) down.addEventListener("click", function () { vote("down"); });
    paint();
  }

  function addImageMessage(dataUrl, caption, who) {
    var wrap = document.createElement("div");
    wrap.className = "message " + who;
    var inner = '<img src="' + dataUrl + '" class="chat-image" alt="Foto">';
    if (caption) inner += '<div class="img-caption">' + formatText(caption) + "</div>";
    if (who === "bot") {
      wrap.innerHTML = '<div class="avatar">' + botAvatarHTML() + '</div><div class="bubble">' + inner + "</div>";
    } else {
      wrap.innerHTML = '<div class="bubble">' + inner + "</div>";
    }
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement("div");
    typingEl.className = "message bot typing";
    typingEl.innerHTML = '<div class="avatar">' + botAvatarHTML() + '</div><div class="bubble"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(typingEl);
    scrollBottom();
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  // --- Cloudflare Turnstile (opsional, i padukshëm) ---
  // Nëse CONFIG.TURNSTILE_SITEKEY është vendosur, merret një token i padukshëm
  // për çdo mesazh dhe dërgohet me kërkesën; serveri e verifikon me
  // TURNSTILE_SECRET. Pa çelësa, gjithçka punon si më parë.
  var turnstileWidgetId = null;
  function turnstileReady() {
    var key = CONFIG.TURNSTILE_SITEKEY || "";
    if (!key) return;
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    s.onload = function () {
      try {
        var div = document.createElement("div");
        div.id = "cf-turnstile";
        div.style.display = "none";
        document.body.appendChild(div);
        turnstileWidgetId = window.turnstile.render("#cf-turnstile", {
          sitekey: key,
          size: "invisible"
        });
      } catch (e) { /* pa Turnstile — vazhdohet normalisht */ }
    };
    document.head.appendChild(s);
  }
  function turnstileToken() {
    return new Promise(function (resolve) {
      try {
        if (turnstileWidgetId === null || !window.turnstile) { resolve(""); return; }
        var done = false;
        var to = setTimeout(function () { if (!done) { done = true; resolve(""); } }, 4000);
        window.turnstile.execute(turnstileWidgetId, {
          action: "chat",
          callback: function (tok) { if (!done) { done = true; clearTimeout(to); resolve(tok || ""); } }
        });
      } catch (e) { resolve(""); }
    });
  }

  // --- Pyetje pasuese inteligjente (chip-a nën çdo përgjigje) ---
  function addFollowups(wrap, topic, lang) {
    try {
      var map = (lang === "en" && CONFIG.FOLLOWUPS_EN) ? CONFIG.FOLLOWUPS_EN : CONFIG.FOLLOWUPS;
      if (!map) return;
      var list = map[topic] || map._generic;
      if (!list || !list.length) return;
      var holder = wrap.querySelector(".bubble-wrap") || wrap;
      var row = document.createElement("div");
      row.className = "followups";
      list.forEach(function (q) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip chip-sm";
        b.textContent = q;
        b.addEventListener("click", function () { send(q); });
        row.appendChild(b);
      });
      holder.appendChild(row);
      scrollBottom();
    } catch (e) {}
  }

  // --- Banner-i i njoftimit të pronarit (hiqet lehtë, mbahet mend për sesionin) ---
  function loadBanner() {
    try {
      fetch(ENDPOINT + "?banner=1").then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (d) {
        var t = d && String(d.banner || "").trim();
        if (!t) return;
        try { if (sessionStorage.getItem("dertli-banner-off")) return; } catch (e) {}
        var bar = document.createElement("div");
        bar.className = "banner";
        var txt = document.createElement("span");
        txt.className = "banner-text";
        txt.textContent = t;
        var x = document.createElement("button");
        x.type = "button";
        x.className = "banner-x";
        x.setAttribute("aria-label", "Mbyll");
        x.textContent = "✕";
        x.addEventListener("click", function () {
          bar.remove();
          try { sessionStorage.setItem("dertli-banner-off", "1"); } catch (e) {}
        });
        bar.appendChild(txt);
        bar.appendChild(x);
        var shell = document.querySelector(".chat-shell");
        if (shell) shell.insertBefore(bar, shell.firstChild);
      }).catch(function () {});
    } catch (e) {}
  }

  // --- Numëruesi publik "sot" (pa kosto, pa të dhëna sensitive) ---
  function loadTodayCount() {
    try {
      fetch(ENDPOINT + "?stats=1").then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (s) {
        if (s && typeof s.total === "number") {
          var el = document.getElementById("today-count");
          if (el) el.textContent = "· " + s.total + " sot";
        }
      }).catch(function () {});
    } catch (e) {}
  }

  function send(text) {
    text = (text || "").trim();
    if (!text || sending) return;

    addMessage(text, "user");
    input.value = "";
    history.push({ role: "user", content: text });
    callApi();
  }

  function sendImage(dataUrl) {
    if (sending) return;
    var caption = input.value.trim();
    input.value = "";
    var parts = [
      { type: "text", text: caption || "Përshkruaj këtë foto shkurt në shqip." },
      { type: "image_url", image_url: { url: dataUrl } }
    ];
    history.push({ role: "user", content: parts });
    addImageMessage(dataUrl, caption, "user");
    callApi();
  }

  function callApi() {
    sending = true;
    sendBtn.disabled = true;
    showTyping();

    turnstileToken().then(function (cfToken) {
      var payload = {
        messages: history,
        systemPrompt: CONFIG.SYSTEM_PROMPT
      };
      if (cfToken) payload.cfToken = cfToken;
      return fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (out) {
        if (!out.ok) {
          if (out.data && out.data.error === "NOT_CONFIGURED") {
            throw new Error(out.data.message);
          }
          if (out.status === 429) {
            var msg429 = (out.data && out.data.message) ||
              "Ke dërguar shumë mesazhe në një kohë të shkurtër. Pusho pak dhe provo përsëri pas disa minutash. ⏳";
            var e429 = new Error(msg429);
            e429.isLockdown = !!(out.data && out.data.error === "LOCKDOWN");
            throw e429;
          }
          // Demo statike në GitHub Pages: nuk ka backend Netlify këtu.
          if (out.status === 404 || out.status === 405) {
            throw new Error("STATIC_DEMO");
          }
          throw new Error((out.data && out.data.error) || ("Gabim " + out.status));
        }
        var reply = String(out.data.reply || "").trim();
        if (!reply) throw new Error("Nuk u mor përgjigje.");
        history.push({ role: "assistant", content: reply });
        addMessage(reply, "bot", "", out.data.topic || null, out.data.lang || "sq");
      })
      .catch(function (err) {
        if (err.message === "STATIC_DEMO" || err instanceof TypeError) {
          addMessage("⚠️ Kjo faqe është demo statike (GitHub Pages) dhe nuk ka lidhje me serverin. Bisedo me Dertli Bot live këtu: https://dertlibot.netlify.app 💬", "bot");
        } else {
          addMessage("⚠️ " + err.message, "bot", err.isLockdown ? "lockdown" : "");
        }
      })
      .then(function () {
        sending = false;
        sendBtn.disabled = false;
        hideTyping();
        input.focus();
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    send(input.value);
  });

  // --- Zëri (mikrofon): Web Speech API, shqip ---
  var micBtn = $("mic-btn");
  var recognition = null;
  var recognizing = false;
  function toggleVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addMessage("⚠️ Shfletuesi yt nuk e mbështet diktimin me zë. Provo Chrome-in.", "bot");
      return;
    }
    if (recognizing) { try { recognition.stop(); } catch (e) {} return; }
    recognition = new SR();
    recognition.lang = "sq-AL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = function (e) {
      var t = e.results[0][0].transcript;
      input.value = (input.value ? input.value + " " : "") + t;
      input.focus();
    };
    recognition.onend = function () {
      recognizing = false;
      micBtn.classList.remove("recording");
    };
    recognition.onerror = function () {
      recognizing = false;
      micBtn.classList.remove("recording");
    };
    try {
      recognition.start();
      recognizing = true;
      micBtn.classList.add("recording");
    } catch (e) {}
  }
  if (micBtn) micBtn.addEventListener("click", toggleVoice);

  // --- Foto: zgjidh, zvogëlo, dërgo te Gemini ---
  var attachBtn = $("attach-btn");
  var imageInput = $("image-input");
  if (attachBtn && imageInput) {
    attachBtn.addEventListener("click", function () { imageInput.click(); });
    imageInput.addEventListener("change", function () {
      var file = imageInput.files && imageInput.files[0];
      imageInput.value = "";
      if (!file) return;
      if (!file.type || file.type.indexOf("image/") !== 0) {
        addMessage("⚠️ Zgjidh një skedar foto.", "bot");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var maxDim = 1024;
          var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          sendImage(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = function () { addMessage("⚠️ Fotoja nuk u lexua.", "bot"); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function init() {
    document.title = CONFIG.BOT_NAME;
    $("bot-name").textContent = CONFIG.BOT_NAME;
    if ($("bot-subtitle")) { $("bot-subtitle").textContent = CONFIG.BOT_SUBTITLE || ""; }
    if (CONFIG.BOT_AVATAR_IMG) { $("bot-avatar").innerHTML = '<img src="' + CONFIG.BOT_AVATAR_IMG + '" alt="Dertli Bot">'; } else { $("bot-avatar").textContent = CONFIG.BOT_AVATAR; }
    document.documentElement.style.setProperty("--primary", CONFIG.THEME_COLOR);

    showWelcome();
    turnstileReady();
    loadTodayCount();
    loadBanner();

    (CONFIG.SUGGESTIONS || []).forEach(function (s) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = s;
      chip.addEventListener("click", function () { send(s); });
      suggestionsEl.appendChild(chip);
    });

    // --- Pluhur ari ambient (animim vetem transform/opacity — shume i lehte) ---
    try {
      var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion) {
        var dust = document.createElement("div");
        dust.className = "dust";
        dust.setAttribute("aria-hidden", "true");
        for (var di = 0; di < 12; di++) {
          var sp = document.createElement("span");
          sp.style.left = (Math.random() * 100).toFixed(2) + "%";
          sp.style.animationDuration = (11 + Math.random() * 10).toFixed(2) + "s";
          sp.style.animationDelay = (-Math.random() * 18).toFixed(2) + "s";
          var sz = (2 + Math.random() * 3).toFixed(1);
          sp.style.width = sz + "px";
          sp.style.height = sz + "px";
          dust.appendChild(sp);
        }
        document.body.appendChild(dust);
      }
    } catch (e) {}
  }

  init();
})();
