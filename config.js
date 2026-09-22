/* ============================================================
   KONFIGURIMI I CHATBOT-IT (vetëm pamja — pa çelësa këtu!)
   ------------------------------------------------------------
   Çelësi API NUK ruhet në këtë skedar. Ai vendoset i FSHEHUR
   te Netlify → Site settings → Environment variables
   (UPSTREAM_KEY). Shfletuesi nuk e sheh kurrë.
   ============================================================ */

const CONFIG = {

  // Emri që shfaqet në krye të bisedës
  BOT_NAME: "Asistenti Im",

  // Emoji / avatar i bot-it
  BOT_AVATAR: "🤖",

  // Mesazhi i parë që dërgon bot-i kur hapet faqja
  WELCOME_MESSAGE: "Përshëndetje! 👋 Unë jam asistenti yt virtual. Si mund të të ndihmoj sot?",

  // Butona sugjerimesh të shpejta (shfaqen poshtë bisedës)
  SUGGESTIONS: [
    "Çfarë mund të bësh?",
    "Më trego për produktet",
    "Si mund të porosis?"
  ],

  // Personaliteti / udhëzimi i bot-it
  SYSTEM_PROMPT: "Je një asistent virtual miqësor dhe i dobishëm. Përgjigju gjithmonë në gjuhën shqipe, qartë dhe shkurt. Nëse nuk e di diçka, thuaje sinqerisht.",

  // Ngjyra kryesore e dizajnit
  THEME_COLOR: "#4f46e5"
};
