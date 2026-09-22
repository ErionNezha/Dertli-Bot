(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var messagesEl = $("messages");
  var form = $("chat-form");
  var input = $("user-input");
  var sendBtn = $("send-btn");
  var suggestionsEl = $("suggestions");

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
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;display:block;margin:8px 0">');    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  function addMessage(text, who) {
    var wrap = document.createElement("div");
    wrap.className = "message " + who;
    if (who === "bot") {
      wrap.innerHTML = '<div class="avatar">' + botAvatarHTML() + '</div><div class="bubble">' + formatText(text) + "</div>";
    } else {
      wrap.innerHTML = '<div class="bubble">' + formatText(text) + "</div>";
    }
    messagesEl.appendChild(wrap);
    scrollBottom();
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
          throw new Error((out.data && out.data.error) || ("Gabim " + out.status));
        }
        var reply = String(out.data.reply || "").trim();
        if (!reply) throw new Error("Nuk u mor përgjigje.");
        history.push({ role: "assistant", content: reply });
        addMessage(reply, "bot");
      })
      .catch(function (err) {
        addMessage("⚠️ " + err.message, "bot");
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

    addMessage(CONFIG.WELCOME_MESSAGE, "bot");

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
