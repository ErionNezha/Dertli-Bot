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
        + '<button type="button" class="msg-act sg-open" title="💡">💡</button>'
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
  // Mesazhi hyrës i personalizuar nga pronari (nëse e ka vendosur nga dashboard-i).
  var customWelcome = "";
  function welcomeText(wasVisited) {
    var base = customWelcome || CONFIG.WELCOME_MESSAGE;
    if (wasVisited) return t("welcomeBack") + base;
    return base;
  }
  function loadWelcome(cb) {
    var done = false;
    function fin() { if (!done) { done = true; if (cb) cb(); } }
    try {
      fetch(ENDPOINT + "?welcome=1").then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (d) {
        var t = d && String(d.welcome || "").trim();
        if (t) customWelcome = t;
      }).catch(function () {}).then(fin);
    } catch (e) { fin(); }
    setTimeout(fin, 4000); // siguri: mos e blloko mirëseardhjen nëse rrjeti vonon
  }
  function showWelcome(wasVisited) {
    messagesEl.innerHTML = "";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { addMessage(welcomeText(wasVisited), "bot"); }
    else { typeMessage(welcomeText(wasVisited)); }
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
      + '<button type="button" class="msg-act sg-open" title="💡">💡</button>'
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
    var sg = wrap.querySelector(".sg-open");
    if (sg) sg.addEventListener("click", function () { openSuggestForm(wrap); });
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
    lastUserQ = text;
    checkBadges();
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

  // ============ VEÇORITË PREMIUM v3 ============
  // --- Gjuha e ndërfaqes (SQ/EN) ---
  var lang = "sq";
  try { lang = localStorage.getItem("dertli-lang") || "sq"; } catch (e) {}
  if (lang !== "en") lang = "sq";
  function t(key) {
    var ui = (CONFIG.UI && CONFIG.UI[lang]) || {};
    return ui[key] !== undefined ? ui[key] : key;
  }
  function setLang(l) {
    lang = (l === "en") ? "en" : "sq";
    try { localStorage.setItem("dertli-lang", lang); } catch (e) {}
    applyLang();
  }
  function applyLang() {
    try {
      input.placeholder = t("placeholder");
      if (sendBtn) sendBtn.title = t("sendTitle");
      var micB = $("mic-btn"); if (micB) micB.title = t("micTitle");
      var attB = $("attach-btn"); if (attB) attB.title = t("attachTitle");
      var langB = $("lang-btn"); if (langB) langB.title = t("langTitle");
      var themeB = $("theme-btn"); if (themeB) themeB.title = t("themeTitle");
      var st = document.querySelector(".bot-status");
      if (st) {
        for (var i = 0; i < st.childNodes.length; i++) {
          var cn = st.childNodes[i];
          if (cn.nodeType === 3 && cn.nodeValue.trim()) { cn.nodeValue = " " + t("online"); break; }
        }
      }
      renderSuggestions();
    } catch (e) {}
  }

  // --- Tema e çelur / e errët ---
  var theme = "dark";
  try { theme = localStorage.getItem("dertli-theme") || "dark"; } catch (e) {}
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    var b = $("theme-btn");
    if (b) b.textContent = theme === "light" ? "🌙" : "☀️";
  }
  function toggleTheme() {
    theme = (theme === "light") ? "dark" : "light";
    try { localStorage.setItem("dertli-theme", theme); } catch (e) {}
    applyTheme();
  }

  // --- Butonat e header-it (gjuha + tema), injektohen me JS ---
  function injectHeaderButtons() {
    try {
      var ha = document.querySelector(".header-actions");
      if (!ha || $("lang-btn")) return;
      var lb = document.createElement("button");
      lb.id = "lang-btn"; lb.type = "button"; lb.className = "icon-btn";
      lb.textContent = "🌍"; lb.title = t("langTitle");
      lb.addEventListener("click", function () { setLang(lang === "sq" ? "en" : "sq"); });
      var tb = document.createElement("button");
      tb.id = "theme-btn"; tb.type = "button"; tb.className = "icon-btn";
      tb.title = t("themeTitle");
      tb.addEventListener("click", toggleTheme);
      ha.insertBefore(tb, ha.firstChild);
      ha.insertBefore(lb, ha.firstChild);
    } catch (e) {}
  }

  // --- Pyetja e ditës ---
  function questionOfDay() {
    var list = CONFIG.QUESTION_OF_DAY || [];
    if (!list.length) return null;
    var idx = Math.floor(Date.now() / 86400000) % list.length;
    return list[idx];
  }

  // --- Sugjerimet: rindërtohen sipas gjuhës + chip-e speciale ---
  function renderSuggestions() {
    try {
      suggestionsEl.innerHTML = "";
      var qd = questionOfDay();
      if (qd) {
        var qc = document.createElement("button");
        qc.type = "button"; qc.className = "chip chip-qotd";
        var qt = qd[lang] || qd.sq;
        qc.innerHTML = '<span class="qotd-label">' + escH(t("qotd")) + '</span><span>' + escH(qt) + "</span>";
        qc.addEventListener("click", function () { send(qt); });
        suggestionsEl.appendChild(qc);
      }
      var list = (lang === "en" && CONFIG.SUGGESTIONS_EN) ? CONFIG.SUGGESTIONS_EN : CONFIG.SUGGESTIONS;
      (list || []).forEach(function (s) {
        var chip = document.createElement("button");
        chip.type = "button"; chip.className = "chip"; chip.textContent = s;
        chip.addEventListener("click", function () { send(s); });
        suggestionsEl.appendChild(chip);
      });
      [["leadBtn", showLeadForm], ["quizBtn", startQuiz], ["pollBtn", showPoll]].forEach(function (p) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip chip-gold"; b.textContent = t(p[0]);
        b.addEventListener("click", p[1]);
        suggestionsEl.appendChild(b);
      });
    } catch (e) {}
  }

  // --- Ndihmës për mesazhe bot-i me përmbajtje HTML ---
  function botHtml(html) {
    botMsgSeq++;
    var wrap = document.createElement("div");
    wrap.className = "message bot";
    wrap.innerHTML = '<div class="avatar">' + botAvatarHTML() + '</div><div class="bubble-wrap"><div class="bubble">' + html + "</div></div>";
    messagesEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }
  function escH(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // --- 📩 Kapja e kontakteve ---
  function showLeadForm() {
    var box = botHtml(
      "<b>" + escH(t("leadBtn")) + "</b><br>" +
      '<input class="lead-in" id="lead-name" placeholder="' + escH(t("leadName")) + '" maxlength="60"><br>' +
      '<input class="lead-in" id="lead-contact" placeholder="' + escH(t("leadContact")) + '" maxlength="80"><br>' +
      '<div class="lead-row"><button type="button" class="chip chip-gold" id="lead-send">' + escH(t("leadSend")) + '</button>' +
      '<button type="button" class="chip" id="lead-cancel">' + escH(t("leadCancel")) + "</button></div>"
    );
    box.querySelector("#lead-cancel").addEventListener("click", function () { box.remove(); });
    box.querySelector("#lead-send").addEventListener("click", function () {
      var nm = box.querySelector("#lead-name").value.trim();
      var ct = box.querySelector("#lead-contact").value.trim();
      if (nm.length < 2 || ct.length < 5) return;
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lead", name: nm, contact: ct })
      }).catch(function () {});
      box.querySelector(".bubble").textContent = t("leadOk");
    });
  }

  // --- 🧩 Kuizi ---
  var quizState = null;
  function startQuiz() {
    var qs = CONFIG.QUIZ || [];
    if (!qs.length) return;
    quizState = { i: 0, score: 0 };
    askQuiz();
  }
  function askQuiz() {
    var qs = CONFIG.QUIZ;
    var st = quizState;
    if (st.i >= qs.length) {
      var total = qs.length;
      var msg = t("quizDone") + " " + st.score + "/" + total + " ";
      msg += st.score === total ? "🏆" : (st.score >= total / 2 ? "👏" : "💪");
      addMessage(msg, "bot");
      quizState = null;
      return;
    }
    var q = qs[st.i];
    var opts = (lang === "en" ? q.o_en : q.o) || q.o;
    var html = "<b>🧩 " + (st.i + 1) + "/" + qs.length + ":</b> " + escH(lang === "en" ? q.q_en : q.q) + '<div class="opt-list">';
    opts.forEach(function (o, i) {
      html += '<button type="button" class="opt-btn" data-i="' + i + '">' + escH(o) + "</button>";
    });
    var box = botHtml(html + "</div>");
    var btns = box.querySelectorAll(".opt-btn");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var pick = parseInt(b.getAttribute("data-i"), 10);
        if (pick === q.c) st.score++;
        btns.forEach(function (x) {
          x.disabled = true;
          var xi = parseInt(x.getAttribute("data-i"), 10);
          if (xi === q.c) x.classList.add("opt-ok");
          else if (xi === pick) x.classList.add("opt-bad");
        });
        st.i++;
        setTimeout(askQuiz, 900);
      });
    });
  }

  // --- 🗳️ Sondazhi ---
  function showPoll() {
    var p = CONFIG.POLL;
    if (!p) return;
    var opts = (lang === "en" ? p.o_en : p.o) || p.o;
    var html = "<b>🗳️ " + escH(lang === "en" ? p.q_en : p.q) + '</b><div class="opt-list">';
    opts.forEach(function (o, i) {
      html += '<button type="button" class="opt-btn" data-i="' + i + '">' + escH(o) + "</button>";
    });
    var box = botHtml(html + "</div>");
    box.querySelectorAll(".opt-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var idx = b.getAttribute("data-i");
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "vote_poll", option: idx })
        }).catch(function () {});
        box.querySelectorAll(".opt-btn").forEach(function (x) { x.disabled = true; });
        b.classList.add("opt-ok");
        setTimeout(function () { box.querySelector(".bubble").textContent = t("pollOk"); }, 600);
      });
    });
  }

  // --- 💡 Sugjero përgjigje më të mirë (nën çdo përgjigje të botit) ---
  var lastUserQ = "";
  function openSuggestForm(wrap) {
    if (wrap.querySelector(".suggest-form")) return;
    var f = document.createElement("div");
    f.className = "suggest-form";
    f.innerHTML = '<textarea class="suggest-ta" placeholder="' + escH(t("suggestPh")) + '" maxlength="1000"></textarea>' +
      '<div class="lead-row"><button type="button" class="chip chip-gold sg-send">' + escH(t("leadSend")) + '</button>' +
      '<button type="button" class="chip sg-cancel">' + escH(t("leadCancel")) + "</button></div>";
    (wrap.querySelector(".bubble-wrap") || wrap).appendChild(f);
    scrollBottom();
    f.querySelector(".sg-cancel").addEventListener("click", function () { f.remove(); });
    f.querySelector(".sg-send").addEventListener("click", function () {
      var v = f.querySelector(".suggest-ta").value.trim();
      if (v.length < 4) return;
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest", question: lastUserQ, suggestion: v })
      }).catch(function () {});
      f.innerHTML = "<i>" + escH(t("suggestOk")) + "</i>";
    });
  }

  // --- 🏅 Badge-e ---
  function checkBadges() {
    try {
      var n = 0;
      try { n = parseInt(localStorage.getItem("dertli-msgcount") || "0", 10) || 0; } catch (e) {}
      n++;
      try { localStorage.setItem("dertli-msgcount", String(n)); } catch (e) {}
      var got = [];
      try { got = JSON.parse(localStorage.getItem("dertli-badges") || "[]"); } catch (e) {}
      (CONFIG.BADGES || []).forEach(function (b) {
        if (b.at === n && got.indexOf(b.at) === -1) {
          got.push(b.at);
          addMessage(lang === "en" ? b.en : b.sq, "bot");
        }
      });
      try { localStorage.setItem("dertli-badges", JSON.stringify(got)); } catch (e) {}
    } catch (e) {}
  }

  function init() {
    document.title = CONFIG.BOT_NAME;
    $("bot-name").textContent = CONFIG.BOT_NAME;
    if ($("bot-subtitle")) { $("bot-subtitle").textContent = CONFIG.BOT_SUBTITLE || ""; }
    if (CONFIG.BOT_AVATAR_IMG) { $("bot-avatar").innerHTML = '<img src="' + CONFIG.BOT_AVATAR_IMG + '" alt="Dertli Bot">'; } else { $("bot-avatar").textContent = CONFIG.BOT_AVATAR; }
    document.documentElement.style.setProperty("--primary", CONFIG.THEME_COLOR);

    injectHeaderButtons();
    applyTheme();
    // "Mirë se erdhe sërish" vetëm për vizitorët e kthyer — vizita regjistrohet
    // PAS shfaqjes së mirëseardhjes, dhe welcome-i custom ngarkohet fillimisht.
    var wasVisited = false;
    try { wasVisited = !!localStorage.getItem("dertli-visited"); } catch (e) {}

    loadWelcome(function () {
      showWelcome(wasVisited);
      try { localStorage.setItem("dertli-visited", "1"); } catch (e) {}
    });
    turnstileReady();
    loadTodayCount();
    loadBanner();
    applyLang();

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
