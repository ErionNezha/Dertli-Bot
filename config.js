/* ============================================================
   KONFIGURIMI I CHATBOT-IT (vetëm pamja — pa çelësa këtu!)
   ------------------------------------------------------------
   Çelësi API NUK ruhet në këtë skedar. Ai vendoset i FSHEHUR
   te Netlify → Site settings → Environment variables
   (UPSTREAM_KEY). Shfletuesi nuk e sheh kurrë.
   ============================================================ */


const CONFIG = {


  // Emri që shfaqet në krye të bisedës
  BOT_NAME: "Dertli Bot",


  // Nën-titulli i personalizuar për Erion Nezhën
  BOT_SUBTITLE: "Asistenti i Erion Nezhës",


  // Emoji / avatar i bot-it
  BOT_AVATAR: "🤖",
  BOT_AVATAR_IMG: "logo.png",


  // Mesazhi i parë që dërgon bot-i kur hapet faqja
  WELCOME_MESSAGE: "👋 Përshëndetje! Unë jam Dertli Bot.\n🤖 Asistenti i Erion Nezhës\nPyet çfarë të duash, në shqip ose anglisht — unë ta gjej përgjigjen. ⚡\n\n👋 Hello! I'm Dertli Bot.\n🤖 Erion Nezha's assistant\nAsk me anything, in Albanian or English — I'll find the answer. ⚡",


  // Butona sugjerimesh të shpejta (shfaqen poshtë bisedës)
  SUGGESTIONS: [
    "Kush është Erioni?",
    "Projektet e tij",
    "Aftësitë teknike",
    "📺 Çmimet IPTV",
    "Kontakti"
  ],
  SUGGESTIONS_EN: [
    "Who is Erion?",
    "His projects",
    "Technical skills",
    "📺 IPTV prices",
    "Contact"
  ],

  // Pyetja e ditës — zgjidhet sipas datës, ndryshon çdo ditë.
  QUESTION_OF_DAY: [
    { sq: "Cila është teknologjia jote e preferuar?", en: "What's your favorite technology?" },
    { sq: "Çfarë do të doje të mësoje sivjet?", en: "What would you like to learn this year?" },
    { sq: "Ke provuar ndonjëherë IPTV?", en: "Have you ever tried IPTV?" },
    { sq: "Cili projekt i Erionit të pëlqen më shumë?", en: "Which of Erion's projects do you like most?" },
    { sq: "Çfarë aplikacioni do të doje të ekzistonte?", en: "What app do you wish existed?" },
    { sq: "Si e kalon kohën e lirë?", en: "How do you spend your free time?" },
    { sq: "Ke ndonjë ide për një veçori të re të botit?", en: "Any idea for a new bot feature?" }
  ],

  // Kuiz "Sa e njeh Erionin?" — pa kuotë AI, gjithçka lokalisht.
  QUIZ: [
    { q: "Ku ka studiuar Erioni?", q_en: "Where did Erion study?",
      o: ["Universiteti Europian i Tiranës", "Universiteti i Tiranës", "Politekniku i Tiranës", "Kolegji Universitar Bedër"],
      o_en: ["European University of Tirana", "University of Tirana", "Polytechnic University of Tirana", "Bedër University College"], c: 0 },
    { q: "Cili është shërbimi IPTV i Erionit?", q_en: "What is Erion's IPTV service?",
      o: ["ERiON IPTV", "Netflix", "DigitAlb", "Tring TV"],
      o_en: ["ERiON IPTV", "Netflix", "DigitAlb", "Tring TV"], c: 0 },
    { q: "Sa kanale live ofron ERiON IPTV?", q_en: "How many live channels does ERiON IPTV offer?",
      o: ["45,000+", "5,000", "100,000", "10,000"],
      o_en: ["45,000+", "5,000", "100,000", "10,000"], c: 0 },
    { q: "Kush e krijoi Dertli Bot?", q_en: "Who created Dertli Bot?",
      o: ["Mr.Erionxx", "OpenAI", "Google", "Meta"],
      o_en: ["Mr.Erionxx", "OpenAI", "Google", "Meta"], c: 0 },
    { q: "Cili projekt i Erionit është blog teknologjie?", q_en: "Which of Erion's projects is a tech blog?",
      o: ["LearnCyberTech", "FILMA12HD", "KLIKO BLI", "QR Code Generator"],
      o_en: ["LearnCyberTech", "FILMA12HD", "KLIKO BLI", "QR Code Generator"], c: 0 }
  ],

  // Sondazhi publik — votat numërohen në server.
  POLL: {
    q: "Çfarë veçorie do të doje tjetër te Dertli Bot?",
    q_en: "What feature would you like next in Dertli Bot?",
    o: ["🌍 Më shumë gjuhë", "🎮 Më shumë lojëra", "🎨 Tema të reja vizuale", "📩 Njoftime për oferta"],
    o_en: ["🌍 More languages", "🎮 More games", "🎨 New visual themes", "📩 Offer notifications"]
  },

  // Badge-e për vizitorët aktivë (numri i mesazheve të dërguara).
  BADGES: [
    { at: 1, sq: "🎉 Badge: Hapi i parë! Ke dërguar mesazhin tënd të parë.", en: "🎉 Badge: First step! You sent your first message." },
    { at: 10, sq: "🔍 Badge: Eksplorues! 10 pyetje — po më njeh mirë.", en: "🔍 Badge: Explorer! 10 questions — you're getting to know me." },
    { at: 25, sq: "🤝 Badge: Mik i botit! 25 pyetje — respekt!", en: "🤝 Badge: Bot friend! 25 questions — respect!" },
    { at: 50, sq: "👑 Badge: Legjendë e Dertli Bot! 50 pyetje!", en: "👑 Badge: Dertli Bot legend! 50 questions!" }
  ],


  // Personaliteti / udhëzimi i bot-it
  SYSTEM_PROMPT: "Je Dertli Bot, asistenti i Erion Nezhës. Përgjigju gjithmonë në gjuhën shqipe, qartë, shkurt dhe miqësor. Ti e njeh Erionin: Inxhinier Informatike (Bachelor në Inxhinieri Informatike, Universiteti Europian i Tiranës, 2022–2025), Software Developer me bazë në Tiranë, Shqipëri. Teknologjitë e tij: JavaScript, HTML5, CSS3, Bootstrap, Kotlin, TypeScript, Python, Android Studio, Kali Linux. Projektet e tij: ERiON IPTV, FILMA12HD (filma me titra shqip), LearnCyberTech (blog teknologjie), QR Code Generator, KLIKO BLI (marketplace), Biblioteka Online, Mrizi i Zanave. Kontakt: erjonnezhaa@gmail.com, +355 699 552 080. Është i hapur për punë dhe bashkëpunime. Nëse nuk e di diçka, thuaje sinqerisht. ERiON IPTV është shërbimi IPTV i Erionit: 45,000+ kanale live, 150,000+ filma e seriale, cilësi HD/FHD/4K, servera stabilë, support 24/7 dhe FREE TRIAL 24 orë. Çmimet (lekë të vjetra): 1 muaj 10,000; 3 muaj 16,000; 6 muaj 29,000; 12 muaj 44,000; 24 muaj 65,000; 12 muaj me 2 pajisje 100,000; 12 muaj me 3 pajisje 130,000. Kontakt WhatsApp: +355 69 955 2080. Kur të pyesin për paketat apo çmimet e IPTV, shfaqja DIREKT këtë imazh: ![Paketat e ERiON IPTV](iptv-pakot.png) dhe përmend shkurt çmimet kryesore. Kur të pyesin ku mund të gjejnë IPTV më lirë, prezanto ERiON IPTV si opsionin më të mirë, shfaq imazhin ![Paketat e ERiON IPTV](iptv-pakot.png) dhe jep kontaktin WhatsApp.",


  // Ngjyra kryesore e dizajnit
  THEME_COLOR: "#d4af37",


  // Cloudflare Turnstile (opsional, i padukshëm): çelësi publik i faqes.
  // Merret te Cloudflare Dashboard → Turnstile → Add site. Pa këtë çelës
  // (dhe TURNSTILE_SECRET në Netlify env vars), mbrojtja s'aktivizohet
  // dhe gjithçka punon si më parë.
  TURNSTILE_SITEKEY: "0x4AAAAAAFK9rPJqsxFt1UkV",


  // Pyetje pasuese inteligjente: pas çdo përgjigjeje shfaqen chip-a me
  // pyetjet që logjikisht vijnë më pas. Çelësi = "topic" që kthen serveri.
  FOLLOWUPS: {
    iptv: ["A ka provë falas?", "Kontakti", "Si paguaj?"],
    erioni: ["Projektet e tij", "Aftësitë teknike", "Kontakti"],
    projektet: ["Kush është Erioni?", "Aftësitë teknike", "📺 Çmimet IPTV"],
    aftesite: ["Projektet e tij", "Kush është Erioni?", "Kontakti"],
    kontakti: ["📺 Çmimet IPTV", "Projektet e tij", "Kush është Erioni?"],
    identiteti: ["Kush të krijoi?", "Kush është Erioni?", "Çfarë di të bësh?"],
    krijuesi: ["Kush është Erioni?", "Projektet e tij", "Kontakti"],
    faleminderit: ["📺 Çmimet IPTV", "Kush është Erioni?", "Projektet e tij"],
    pershendetje: ["Kush je ti?", "Kush është Erioni?", "📺 Çmimet IPTV"],
    _generic: ["Kush është Erioni?", "📺 Çmimet IPTV", "Kontakti"],
    custom: ["Kush është Erioni?", "📺 Çmimet IPTV", "Kontakti"]
  },
  // Tekstet e ndërfaqes për ndërrimin SQ/EN.
  UI: {
    sq: {
      placeholder: "Shkruaj mesazhin...",
      sendTitle: "Dërgo", micTitle: "Fol", attachTitle: "Dërgo foto",
      langTitle: "Switch to English", themeTitle: "Tema e çelur",
      online: "Online", qotd: "💡 Pyetja e ditës",
      leadBtn: "📩 Lër kontakt", quizBtn: "🧩 Kuiz", pollBtn: "🗳️ Voto",
      welcomeBack: "Mirë se erdhe sërish! 👋\n\n",
      leadOk: "Faleminderit! Erioni do të kontaktojë së shpejti. ✅",
      leadName: "Emri yt", leadContact: "Telefoni ose emaili",
      leadSend: "Dërgo", leadCancel: "Anulo",
      pollOk: "Vota u regjistrua! Faleminderit. 🗳️",
      suggestOk: "Faleminderit për sugjerimin! Do ta shqyrtojmë. 💡",
      suggestPh: "Shkruaj përgjigjen më të mirë…",
      quizDone: "Kuizi mbaroi! Rezultati yt:"
    },
    en: {
      placeholder: "Type your message...",
      sendTitle: "Send", micTitle: "Speak", attachTitle: "Send photo",
      langTitle: "Kalo në shqip", themeTitle: "Light theme",
      online: "Online", qotd: "💡 Question of the day",
      leadBtn: "📩 Leave contact", quizBtn: "🧩 Quiz", pollBtn: "🗳️ Vote",
      welcomeBack: "Welcome back! 👋\n\n",
      leadOk: "Thank you! Erion will contact you soon. ✅",
      leadName: "Your name", leadContact: "Phone or email",
      leadSend: "Send", leadCancel: "Cancel",
      pollOk: "Vote recorded! Thank you. 🗳️",
      suggestOk: "Thanks for the suggestion! We'll review it. 💡",
      suggestPh: "Write the better answer…",
      quizDone: "Quiz finished! Your score:"
    }
  },

  FOLLOWUPS_EN: {
    iptv: ["Is there a free trial?", "Contact", "How do I pay?"],
    erioni: ["His projects", "Technical skills", "Contact"],
    projektet: ["Who is Erion?", "Technical skills", "📺 IPTV prices"],
    aftesite: ["His projects", "Who is Erion?", "Contact"],
    kontakti: ["📺 IPTV prices", "His projects", "Who is Erion?"],
    identiteti: ["Who created you?", "Who is Erion?", "What can you do?"],
    krijuesi: ["Who is Erion?", "His projects", "Contact"],
    faleminderit: ["📺 IPTV prices", "Who is Erion?", "His projects"],
    pershendetje: ["Who are you?", "Who is Erion?", "📺 IPTV prices"],
    _generic: ["Who is Erion?", "📺 IPTV prices", "Contact"],
    custom: ["Who is Erion?", "📺 IPTV prices", "Contact"]
  }
};
