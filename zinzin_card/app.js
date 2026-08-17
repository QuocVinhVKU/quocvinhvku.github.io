const GOOGLE_PLAY_DEVELOPER_URL = "https://play.google.com/store/apps/dev?id=5150542485434976911";
const APP_STORE_DEVELOPER_URL = "https://apps.apple.com/us/developer/dang-quoc-vinh/id1784945397";

const links = [
  { id:"facebook", category:"social", title:"Follow ZinZin on Facebook", url:"https://www.facebook.com/furryzinzin/", icon:"facebook" },
  { id:"twitter", category:"social", title:"Follow @ZinZin_Furry on X", url:"https://x.com/ZinZin_Furry", icon:"x" },
  { id:"tiktok", category:"social", title:"Follow ZinZin on TikTok", url:"https://www.tiktok.com/@zinzin_furry", icon:"tiktok" },
  { id:"telegram", category:"russian", title:"Присоединяйтесь к Telegram ЗинЗина", subtitle:"Русское сообщество 🇷🇺", url:"https://t.me/zinzin_group", icon:"telegram", language:"ru" },
  { id:"boosty", category:"russian", title:"Поддержать ЗинЗина на Boosty", subtitle:"Эксклюзивный контент и поддержка 💙", url:"https://boosty.to/zinzin_furry", icon:"boosty", language:"ru" },
  { id:"patreon", category:"support", title:"Support The Valley Of Fur on Patreon", subtitle:"A furry NSFW game — support development & exclusive content", url:"https://www.patreon.com/zinzin_furry", icon:"patreon" },
  { id:"google-play", category:"games", title:"Furry Games on Google Play", subtitle:"Discover all furry games by ZinhPixry", url:GOOGLE_PLAY_DEVELOPER_URL, icon:"google-play" },
  { id:"app-store", category:"games", title:"Furry Games on the App Store", subtitle:"Discover all furry games by ZinhPixry", url:APP_STORE_DEVELOPER_URL, icon:"apple" },
  { id:"website", category:"games", title:"Visit the Official Website", subtitle:"ZinhPixry", url:"https://www.zinhpixry.website/", icon:"globe" }
];

const categories = [
  { id:"social", title:"Follow ZinZin" },
  { id:"support", title:"Support" },
  { id:"games", title:"Games & Projects" },
  { id:"russian", title:"Русское сообщество", lang:"ru" }
];

function trackLinkClick(id) {
  window.dispatchEvent(new CustomEvent("zinzin:link-click", { detail:{ id } }));
}

function linkCard(link, index) {
  const safeUrl = link.pending ? "#" : link.url;
  const pendingText = link.pending ? `${link.subtitle} · URL coming soon` : link.subtitle;
  return `<a class="link-card" style="--i:${index}" href="${safeUrl}" ${link.pending ? 'aria-disabled="true"' : 'target="_blank" rel="noopener noreferrer"'} data-link-id="${link.id}" ${link.language ? `lang="${link.language}"` : ""}>
    <span class="brand-icon" aria-hidden="true"><svg><use href="#icon-${link.icon}"></use></svg></span>
    <span class="link-copy"><span class="link-title">${link.title}</span>${pendingText ? `<span class="link-subtitle">${pendingText}</span>` : ""}</span>
    <svg class="arrow" aria-hidden="true"><use href="#icon-arrow"></use></svg>
  </a>`;
}

document.getElementById("link-sections").innerHTML = categories.map(category => {
  const group = links.filter(link => link.category === category.id);
  return `<section class="link-section" ${category.lang ? `lang="${category.lang}"` : ""} aria-labelledby="section-${category.id}">
    <h2 id="section-${category.id}">${category.title}</h2><div class="cards">${group.map(linkCard).join("")}</div>
  </section>`;
}).join("");

document.querySelectorAll(".link-card").forEach(card => card.addEventListener("click", event => {
  if (card.getAttribute("aria-disabled") === "true") { event.preventDefault(); showToast("Developer page URL coming soon 💙"); return; }
  trackLinkClick(card.dataset.linkId);
}));

let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

async function copyPageUrl() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(location.href);
    } else {
      const input = document.createElement("textarea");
      input.value = location.href;
      input.setAttribute("readonly", "");
      input.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      if (!copied) throw new Error("Copy command failed");
    }
    showToast("Link copied! 💙");
  } catch {
    showToast("Please copy the URL from your browser");
  }
}

document.getElementById("share-button").addEventListener("click", async () => {
  const nativeShareIsSafe = location.protocol !== "file:" && window.isSecureContext && typeof navigator.share === "function";
  if (!nativeShareIsSafe) { await copyPageUrl(); return; }
  try {
    await navigator.share({ title:"ZinZin — Official Links", text:"Visit ZinZin's official links 💙", url:location.href });
  } catch (error) {
    if (error.name !== "AbortError") await copyPageUrl();
  }
});
