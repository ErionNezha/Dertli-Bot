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

  function addMessage(text, who) {
    var wrap = document.createElement("div");
    wrap.className = "message " + who;
    if (who === "bot") {
      botMsgSeq++;
      var mid = "m" + Date.now() + "-" + botMsgSeq;
      wrap.innerHTML = '<div class="avatar">' + botAvatarHTML() + '</div><div class="bubble-wrap"><div class="bubble">' + formatText(text) + '</div><div class="msg-actions">'
        + '<button type="button" class="msg-act fb-up" title="Më pëlqeu">👍</button>'
        + '<button type="button" class="msg-act fb-down" title="Nuk më pëlqeu">👎</button>'
        + "</div></div>";
      wireMessageActions(wrap, mid);
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

  // --- Përshëndetja fillestare ---
  function showWelcome() {
    messagesEl.innerHTML = "";
    addMessage(CONFIG.WELCOME_MESSAGE, "bot");
    input.focus();
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

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history,
        systemPrompt: CONFIG.SYSTEM_PROMPT
      })
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
            throw new Error("Ke dërguar shumë mesazhe në një kohë të shkurtër. Pusho pak dhe provo përsëri pas disa minutash. ⏳");
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
        addMessage(reply, "bot");
      })
      .catch(function (err) {
        if (err.message === "STATIC_DEMO" || err instanceof TypeError) {
          addMessage("⚠️ Kjo faqe është demo statike (GitHub Pages) dhe nuk ka lidhje me serverin. Bisedo me Dertli Bot live këtu: https://dertlibot.netlify.app 💬", "bot");
        } else {
          addMessage("⚠️ " + err.message, "bot");
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

    (CONFIG.SUGGESTIONS || []).forEach(function (s) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = s;
      chip.addEventListener("click", function () { send(s); });
      suggestionsEl.appendChild(chip);
    });
  }

  init();
})();
