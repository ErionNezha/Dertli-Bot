var token = sessionStorage.getItem("dertli_stats_token") || "";
var TOPIC_LABELS = {iptv:"📺 Çmimet IPTV",erioni:"Kush është Erioni",projektet:"Projektet",
  aftesite:"Aftësitë teknike",kontakti:"Kontakti",identiteti:"Kush je ti",
  krijuesi:"Kush të krijoi",faleminderit:"Faleminderit",pershendetje:"Përshëndetje",custom:"⚡ Të miat"};
function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function fetchStats(){
  return fetch("/.netlify/functions/chat?stats=1", { headers: { "X-Stats-Token": token } })
    .then(function(r){ if(!r.ok) throw new Error("http"); return r.json(); });
}
function barsInto(el, entries, fmt){
  el.innerHTML = "";
  entries.sort(function(a,b){ return b[1]-a[1]; });
  var max = entries.length ? entries[0][1] : 1;
  if(!entries.length){ el.innerHTML = '<div class="foot">Asnjë e dhënë sot.</div>'; return; }
  entries.forEach(function(e){
    var row = document.createElement("div");
    row.className = "bar-row";
    var pct = Math.max(2, Math.round(e[1]/max*100));
    row.innerHTML = '<div class="lbl"><span>' + esc(fmt ? fmt(e[0]) : e[0]) + '</span><b>' + e[1] + '</b></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>';
    el.appendChild(row);
  });
}
function render(s){
  if(!s || !s.perLink){ throw new Error("token"); }
  document.getElementById("login").classList.add("hidden");
  document.getElementById("dash").classList.remove("hidden");
  document.getElementById("err").style.display = "none";
  document.getElementById("d-total").textContent = s.total;
  document.getElementById("d-blocked").textContent = s.rateLimited;
  document.getElementById("d-lock").textContent = s.lockdownImposed;
  document.getElementById("d-faq").textContent = (typeof s.faqHits === "number") ? s.faqHits : "–";
  // Kënaqësia
  var up = (s.ratings && s.ratings.up) || 0, down = (s.ratings && s.ratings.down) || 0;
  document.getElementById("d-up").textContent = up;
  document.getElementById("d-down").textContent = down;
  var pct = (up + down) ? Math.round(up/(up+down)*100) : 0;
  document.getElementById("d-satbar").style.width = pct + "%";
  // Hallkat
  barsInto(document.getElementById("bars"),
    Object.keys(s.perLink).map(function(k){ return [k, s.perLink[k]]; }));
  // Temat
  barsInto(document.getElementById("topics"),
    Object.keys(s.faqTopics || {}).map(function(k){ return [k, s.faqTopics[k]]; }),
    function(k){ return TOPIC_LABELS[k] || k; });
  // Orët
  var hb = document.getElementById("hours"), hl = document.getElementById("hours-lbl");
  hb.innerHTML = ""; hl.innerHTML = "";
  var hmax = 1, hv = [];
  for(var h = 0; h < 24; h++){
    var v = (s.hourly && s.hourly[String(h)]) || 0;
    hv.push(v); if(v > hmax) hmax = v;
  }
  for(var h2 = 0; h2 < 24; h2++){
    var d = document.createElement("div");
    d.style.height = Math.max(3, Math.round(hv[h2]/hmax*100)) + "%";
    d.title = h2 + ":00 — " + hv[h2];
    hb.appendChild(d);
    var l = document.createElement("span");
    l.textContent = (h2 % 3 === 0) ? h2 : "";
    hl.appendChild(l);
  }
  // Kandidatët
  var ce = document.getElementById("cand");
  ce.innerHTML = "";
  var cand = s.candidates || [];
  if(!cand.length){ ce.innerHTML = '<div class="foot">Ende asnjë kandidat sot.</div>'; }
  var shown = cand.slice(0, 10);
  if(!shown.length){ ce.innerHTML = '<div class="foot">Ende asnjë kandidat sot.</div>'; }
  shown.forEach(function(c){
    var row = document.createElement("div");
    row.className = "cand-row";
    var lbl = document.createElement("span");
    lbl.textContent = c[0] + " ";
    var cnt = document.createElement("b");
    cnt.textContent = "×" + c[1];
    var add = document.createElement("button");
    add.type = "button"; add.className = "addbtn"; add.textContent = "+ Shto";
    add.title = "Shkruaj përgjigjen dhe bëje të çastit";
    add.addEventListener("click", function(){ openCandForm(row, c[0]); });
    row.appendChild(lbl); row.appendChild(cnt); row.appendChild(add);
    ce.appendChild(row);
  });
  // Banner
  document.getElementById("banner-now").textContent =
    s.banner ? "Aktiv: " + s.banner : "(asnjë banner aktiv)";
  // Welcome
  document.getElementById("welcome-now").textContent =
    s.welcome ? "Aktiv: " + s.welcome : "(mesazhi i paracaktuar)";
  // Përgjigjet e mia të shpejta
  var me = document.getElementById("myfaq");
  me.innerHTML = "";
  var mine = s.customFaq || [];
  if(!mine.length){ me.innerHTML = '<div class="foot">Ende asnjë. Shtoja nga kandidatët më lart.</div>'; }
  mine.forEach(function(e){
    var row = document.createElement("div");
    row.className = "faqrow";
    var q = document.createElement("span");
    q.className = "q"; q.textContent = e.q;
    var del = document.createElement("button");
    del.type = "button"; del.className = "del"; del.textContent = "Fshi";
    del.addEventListener("click", function(){
      ownerPost({ action: "del_faq", token: token, question: e.q }).then(refresh);
    });
    row.appendChild(q); row.appendChild(del);
    me.appendChild(row);
  });
  // Kontaktet e lëna nga vizitorët
  var le = document.getElementById("leads");
  le.innerHTML = "";
  var leads = s.leads || [];
  if(!leads.length){ le.innerHTML = '<div class="foot">Ende asnjë kontakt.</div>'; }
  leads.slice().reverse().forEach(function(l){
    var row = document.createElement("div");
    row.className = "cand-row";
    var lbl = document.createElement("span");
    lbl.innerHTML = "<b>" + esc(l.name) + "</b> — " + esc(l.contact) +
      ' <span class="foot">' + esc((l.at || "").slice(0, 16).replace("T", " ")) + "</span>";
    var del = document.createElement("button");
    del.type = "button"; del.className = "del"; del.textContent = "Fshi";
    del.addEventListener("click", function(){
      ownerPost({ action: "del_lead", token: token, idx: s.leads.indexOf(l) }).then(refresh);
    });
    row.appendChild(lbl); row.appendChild(del);
    le.appendChild(row);
  });
  // Sondazhi
  var pr = document.getElementById("pollres");
  pr.innerHTML = "";
  var pv = s.pollVotes || {};
  var pkeys = Object.keys(pv);
  if(!pkeys.length){ pr.innerHTML = '<div class="foot">Ende asnjë votë.</div>'; }
  else {
    var pent = pkeys.map(function(k){ return ["Opsioni " + (parseInt(k, 10) + 1), pv[k]]; });
    barsInto(pr, pent);
  }
  // Sugjerimet nga vizitorët
  var sg = document.getElementById("sugg");
  sg.innerHTML = "";
  var suggs = s.suggestions || [];
  if(!suggs.length){ sg.innerHTML = '<div class="foot">Ende asnjë sugjerim.</div>'; }
  suggs.slice().reverse().forEach(function(g){
    var box = document.createElement("div");
    box.className = "sugg-box";
    box.innerHTML = '<div class="q">\u201c' + esc(g.q) + '\u201d</div><div>' + esc(g.suggestion) + "</div>";
    var br = document.createElement("div"); br.className = "btnrow";
    var ap = document.createElement("button"); ap.type = "button"; ap.textContent = "✅ Aprovo si përgjigje të shpejtë";
    ap.addEventListener("click", function(){
      ownerPost({ action: "add_faq", token: token, question: g.q, answer: g.suggestion })
        .then(function(){ return ownerPost({ action: "del_suggestion", token: token, idx: s.suggestions.indexOf(g) }); })
        .then(refresh);
    });
    var dl = document.createElement("button"); dl.type = "button"; dl.className = "del"; dl.textContent = "Fshi";
    dl.addEventListener("click", function(){
      ownerPost({ action: "del_suggestion", token: token, idx: s.suggestions.indexOf(g) }).then(refresh);
    });
    br.appendChild(ap); br.appendChild(dl);
    box.appendChild(br);
    sg.appendChild(box);
  });
  // IP të bllokuara
  var bl = document.getElementById("blocks");
  bl.innerHTML = "";
  var blocks = s.manualBlocks || [];
  if(!blocks.length){ bl.innerHTML = '<div class="foot">Asnjë IP e bllokuar manualisht.</div>'; }
  blocks.forEach(function(ip){
    var row = document.createElement("div");
    row.className = "cand-row";
    var lbl = document.createElement("span"); lbl.textContent = ip;
    var un = document.createElement("button");
    un.type = "button"; un.className = "del"; un.textContent = "Zhblloko";
    un.addEventListener("click", function(){
      ownerPost({ action: "unblock_ip", token: token, ip: ip }).then(refresh);
    });
    row.appendChild(lbl); row.appendChild(un);
    bl.appendChild(row);
  });
  // IP abuzive (lockdown automatik) — me buton bllokimi manual
  var ab = document.getElementById("abusive");
  ab.innerHTML = "";
  var abusive = s.abusiveIps || [];
  if(!abusive.length){ ab.innerHTML = '<div class="foot">Asnjë IP abuzive e regjistruar.</div>'; }
  abusive.forEach(function(e){
    var row = document.createElement("div");
    row.className = "cand-row";
    var lbl = document.createElement("span");
    lbl.textContent = e.ip + " · " + e.count + "×" + (e.blocked ? " · e bllokuar" : "");
    row.appendChild(lbl);
    if(!e.blocked){
      var bk = document.createElement("button");
      bk.type = "button"; bk.textContent = "Blloko";
      bk.addEventListener("click", function(){
        ownerPost({ action: "block_ip", token: token, ip: e.ip }).then(refresh);
      });
      row.appendChild(bk);
    }
    ab.appendChild(row);
  });
  // Grafiku javor: 6 ditët e fundit nga historia + sot
  var wk = document.getElementById("week");
  wk.innerHTML = "";
  var hist = s.history || {};
  var days = [];
  for(var i = 6; i >= 0; i--){
    var d = new Date(); d.setDate(d.getDate() - i);
    var key = d.toISOString().slice(0, 10);
    var val = (i === 0) ? s.total : ((hist[key] && hist[key].total) || 0);
    days.push({ key: key, label: d.toLocaleDateString("sq-AL", { weekday: "short" }), total: val, today: i === 0 });
  }
  var wmax = 1;
  days.forEach(function(x){ if(x.total > wmax) wmax = x.total; });
  days.forEach(function(x){
    var col = document.createElement("div");
    col.className = "wcol";
    var v = document.createElement("div");
    v.className = "wv"; v.textContent = x.total;
    var bar = document.createElement("div");
    bar.className = "wbar";
    bar.style.height = Math.max(3, Math.round(x.total / wmax * 64)) + "px";
    if(x.today) bar.style.opacity = "1"; else bar.style.opacity = ".65";
    var l = document.createElement("div");
    l.className = "wl"; l.textContent = x.today ? "sot" : x.label;
    col.appendChild(v); col.appendChild(bar); col.appendChild(l);
    wk.appendChild(col);
  });
  document.getElementById("d-time").textContent = new Date().toLocaleTimeString("sq-AL");
}
function openCandForm(row, question){
  if(row.nextSibling && row.nextSibling.className === "cand-form") return;
  var f = document.createElement("div");
  f.className = "cand-form";
  var ta = document.createElement("textarea");
  ta.placeholder = "Shkruaj përgjigjen e shpejtë…";
  var btnrow = document.createElement("div");
  btnrow.className = "btnrow";
  var save = document.createElement("button");
  save.type = "button"; save.textContent = "Ruaje si përgjigje të shpejtë";
  var cancel = document.createElement("button");
  cancel.type = "button"; cancel.className = "ghost"; cancel.textContent = "Anulo";
  save.addEventListener("click", function(){
    var ans = ta.value.trim();
    if(ans.length < 4){ ta.focus(); return; }
    ownerPost({ action: "add_faq", token: token, question: question, answer: ans })
      .then(function(){ refresh(); });
  });
  cancel.addEventListener("click", function(){ f.remove(); });
  btnrow.appendChild(save); btnrow.appendChild(cancel);
  f.appendChild(ta); f.appendChild(btnrow);
  row.parentNode.insertBefore(f, row.nextSibling);
}
function ownerPost(body){
  var b = Object.assign({}, body);
  delete b.token; // tokeni dërgohet VETËM në headerin X-Stats-Token, kurrë në body
  return fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Stats-Token": token },
    body: JSON.stringify(b)
  }).then(function(r){ return r.json(); });
}
function setBanner(text){
  return fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Stats-Token": token },
    body: JSON.stringify({ action: "set_banner", text: text })
  }).then(function(r){ return r.json(); });
}
document.getElementById("go").addEventListener("click", function(){
  token = document.getElementById("token").value.trim();
  fetchStats().then(function(s){
    sessionStorage.setItem("dertli_stats_token", token);
    render(s);
  }).catch(function(){
    document.getElementById("err").style.display = "block";
  });
});
document.getElementById("token").addEventListener("keydown", function(e){
  if(e.key === "Enter"){ document.getElementById("go").click(); }
});
document.getElementById("banner-set").addEventListener("click", function(){
  var t = document.getElementById("banner-text").value.trim();
  if(!t) return;
  setBanner(t).then(function(){ document.getElementById("banner-text").value = ""; refresh(); });
});
document.getElementById("banner-clear").addEventListener("click", function(){
  setBanner("").then(refresh);
});
document.getElementById("welcome-set").addEventListener("click", function(){
  var t = document.getElementById("welcome-text").value.trim();
  ownerPost({ action: "set_welcome", token: token, text: t }).then(function(){
    document.getElementById("welcome-text").value = "";
    refresh();
  });
});
document.getElementById("welcome-clear").addEventListener("click", function(){
  ownerPost({ action: "set_welcome", token: token, text: "" }).then(refresh);
});
document.getElementById("csv").addEventListener("click", function(){
  fetchStats().then(function(s){
    var rows = [];
    rows.push(["seksioni", "celesi", "vlera"]);
    var day = s.day || new Date().toISOString().slice(0, 10);
    rows.push(["permledhje", "data", day]);
    rows.push(["permledhje", "mesazhe", s.total]);
    rows.push(["permledhje", "te_bllokuara", s.rateLimited]);
    rows.push(["permledhje", "lockdown", s.lockdownImposed]);
    rows.push(["permledhje", "te_shpejta", s.faqHits || 0]);
    rows.push(["permledhje", "pelqime", (s.ratings && s.ratings.up) || 0]);
    rows.push(["permledhje", "mospelqime", (s.ratings && s.ratings.down) || 0]);
    Object.keys(s.perLink || {}).forEach(function(k){ rows.push(["hallka", k, s.perLink[k]]); });
    Object.keys(s.faqTopics || {}).forEach(function(k){ rows.push(["tema", k, s.faqTopics[k]]); });
    for(var h2 = 0; h2 < 24; h2++){ rows.push(["ora", String(h2), (s.hourly && s.hourly[String(h2)]) || 0]); }
    (s.candidates || []).forEach(function(c){ rows.push(["kandidat", c[0], c[1]]); });
    (s.leads || []).forEach(function(l){ rows.push(["kontakt", l.name, l.contact, (l.at || "").slice(0, 16)]); });
    Object.keys(s.history || {}).sort().forEach(function(d){
      var x = s.history[d];
      rows.push(["dita", d, "mesazhe=" + x.total + " te_shpejta=" + x.faqHits + " 👍=" + x.up + " 👎=" + x.down]);
    });
    var q = function(v){ return '"' + String(v).replace(/"/g, '""') + '"'; };
    var csv = "﻿" + rows.map(function(r){ return r.map(q).join(","); }).join("\r\n");
    var a2 = document.createElement("a");
    a2.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a2.download = "dertli-bot-" + day + ".csv";
    document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
  });
});
function refresh(){
  if(token) fetchStats().then(render).catch(function(){});
}
if(token){
  document.getElementById("token").value = token;
  fetchStats().then(render).catch(function(){
    sessionStorage.removeItem("dertli_stats_token");
    token = "";
  });
}
  document.getElementById("block-ip-add").addEventListener("click", function(){
    var ip = document.getElementById("block-ip-in").value.trim();
    if(!ip) return;
    ownerPost({ action: "block_ip", token: token, ip: ip }).then(function(){
      document.getElementById("block-ip-in").value = "";
      refresh();
    });
  });
  document.getElementById("set-export").addEventListener("click", function(){
    ownerPost({ action: "export_settings", token: token }).then(function(d){
      var blob = new Blob([JSON.stringify(d.settings, null, 2)], { type: "application/json" });
      var a2 = document.createElement("a");
      a2.href = URL.createObjectURL(blob);
      a2.download = "dertli-bot-cilësimet.json";
      document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
    });
  });
  document.getElementById("set-import").addEventListener("click", function(){
    document.getElementById("set-file").click();
  });
  document.getElementById("set-file").addEventListener("change", function(e){
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if(!f) return;
    var rd = new FileReader();
    rd.onload = function(){
      try {
        var data = JSON.parse(rd.result);
        ownerPost({ action: "import_settings", token: token, data: data }).then(refresh);
      } catch(err){}
    };
    rd.readAsText(f);
  });
setInterval(refresh, 60000);
