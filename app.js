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
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

  function init() {
    document.title = CONFIG.BOT_NAME;
    $("bot-name").textContent = CONFIG.BOT_NAME;
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
