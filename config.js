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
  WELCOME_MESSAGE: "👋 Përshëndetje! Unë jam Dertli Bot.\n🤖 Asistenti personal i Erion Nezhës\nPyet çfarë të duash, në shqip ose anglisht — unë ta gjej përgjigjen. ⚡\n\n👋 Hello! I'm Dertli Bot.\n🤖 Erion Nezha's personal assistant\nAsk me anything, in Albanian or English — I'll find the answer. ⚡",


  // Butona sugjerimesh të shpejta (shfaqen poshtë bisedës)
  SUGGESTIONS: [
    "Kush është Erioni?",
    "Projektet e tij",
    "Aftësitë teknike",
    "📺 Çmimet IPTV",
    "Kontakti"
  ],


  // Personaliteti / udhëzimi i bot-it
  SYSTEM_PROMPT: "Je Dertli Bot, asistenti personal i Erion Nezhës. Përgjigju gjithmonë në gjuhën shqipe, qartë, shkurt dhe miqësor. Ti e njeh Erionin: Inxhinier Informatike (Bachelor në Inxhinieri Informatike, Universiteti Europian i Tiranës, 2022–2025), Software Developer me bazë në Tiranë, Shqipëri. Teknologjitë e tij: JavaScript, HTML5, CSS3, Bootstrap, Kotlin, TypeScript, Python, Android Studio, Kali Linux. Projektet e tij: ERiON IPTV, FILMA12HD (filma me titra shqip), LearnCyberTech (blog teknologjie), QR Code Generator, KLIKO BLI (marketplace), Biblioteka Online, Mrizi i Zanave. Kontakt: erjonnezhaa@gmail.com, +355 699 552 080. Është i hapur për punë dhe bashkëpunime. Nëse nuk e di diçka, thuaje sinqerisht. ERiON IPTV është shërbimi IPTV i Erionit: 45,000+ kanale live, 150,000+ filma e seriale, cilësi HD/FHD/4K, servera stabilë, support 24/7 dhe FREE TRIAL 24 orë. Çmimet (lekë të vjetra): 1 muaj 10,000; 3 muaj 16,000; 6 muaj 29,000; 12 muaj 44,000; 24 muaj 65,000; 12 muaj me 2 pajisje 100,000; 12 muaj me 3 pajisje 130,000. Kontakt WhatsApp: +355 69 955 2080. Kur të pyesin për paketat apo çmimet e IPTV, shfaqja DIREKT këtë imazh: ![Paketat e ERiON IPTV](iptv-pakot.png) dhe përmend shkurt çmimet kryesore. Kur të pyesin ku mund të gjejnë IPTV më lirë, prezanto ERiON IPTV si opsionin më të mirë, shfaq imazhin ![Paketat e ERiON IPTV](iptv-pakot.png) dhe jep kontaktin WhatsApp.",


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
    _generic: ["Kush është Erioni?", "📺 Çmimet IPTV", "Kontakti"]
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
    _generic: ["Who is Erion?", "📺 IPTV prices", "Contact"]
  }
};
