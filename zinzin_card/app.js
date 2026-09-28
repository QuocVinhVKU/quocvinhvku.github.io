const GOOGLE_PLAY_DEVELOPER_URL = "https://play.google.com/store/apps/dev?id=5150542485434976911";
const APP_STORE_DEVELOPER_URL = "https://apps.apple.com/us/developer/dang-quoc-vinh/id1784945397";

const links = [
  { id:"facebook", category:"social", title:"Follow ZinZin on Facebook", url:"https://www.facebook.com/zinzinfurry/", icon:"facebook" },
  { id:"twitter", category:"social", title:"Follow @ZinZin_Furry on X", url:"https://x.com/ZinZin_Furry", icon:"x" },
  { id:"tiktok", category:"social", title:"Follow ZinZin on TikTok", url:"https://www.tiktok.com/@zinzin_furry", icon:"tiktok" },
  { id:"youtube", category:"social", title:"Watch ZinZin on YouTube", subtitle:"Videos, furry content & adventures", url:"https://www.youtube.com/@zinzin_furry", icon:"youtube" },
  { id:"telegram", category:"russian", title:"Присоединяйтесь к Telegram ЗинЗина", subtitle:"Русское сообщество 🇷🇺", url:"https://t.me/zinzin_group", icon:"telegram", language:"ru" },
  { id:"boosty", category:"russian", title:"Поддержать ЗинЗина на Boosty", subtitle:"Эксклюзивный контент и поддержка 💙", url:"https://boosty.to/zinzin_furry", icon:"boosty", language:"ru" },
  { id:"telegram-furry", category:"telegram-channel", title:"Follow ZinZin on Telegram", url:"https://t.me/zinzin_furry", icon:"telegram" },
  { id:"google-play", category:"games", title:"Furry Games on Google Play", subtitle:"Discover all furry games by ZinhPixry", url:GOOGLE_PLAY_DEVELOPER_URL, icon:"google-play" },
  { id:"app-store", category:"games", title:"Furry Games on the App Store", subtitle:"Discover all furry games by ZinhPixry", url:APP_STORE_DEVELOPER_URL, icon:"apple" },
  { id:"website", category:"games", title:"Visit the Official Website", subtitle:"ZinhPixry", url:"https://www.zinhpixry.website/", icon:"globe" }
];

const categories = [
  { id:"social", title:"Follow ZinZin" },
  { id:"telegram-channel", title:"Telegram" },
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

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");
const cursorGlow = document.getElementById("cursor-glow");

{
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const hideGlow = () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    cursorGlow.classList.remove("active");
  };
  window.addEventListener("pointermove", event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType === "touch") return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      cursorGlow.style.transform = `translate3d(${pointerX - 130}px, ${pointerY - 130}px, 0)`;
      cursorGlow.classList.add("active");
      pointerFrame = 0;
    });
  }, { passive:true });
  document.documentElement.addEventListener("mouseleave", hideGlow);
  window.addEventListener("blur", hideGlow);
  reducedMotion.addEventListener("change", hideGlow);
  finePointer.addEventListener("change", hideGlow);
}

{
  let lastBurst = 0;
  window.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.pointerType === "touch" || !finePointer.matches || reducedMotion.matches) return;
    const now = performance.now();
    if (now - lastBurst < 120) return;
    lastBurst = now;
    const paw = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    paw.classList.add("click-paw");
    paw.setAttribute("viewBox", "0 0 64 64");
    paw.setAttribute("aria-hidden", "true");
    paw.style.left = `${event.clientX}px`;
    paw.style.top = `${event.clientY}px`;
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-paw");
    paw.appendChild(use);
    document.body.appendChild(paw);
    paw.addEventListener("animationend", () => paw.remove(), { once:true });
    setTimeout(() => paw.remove(), 900);

    for (let index = 0; index < 4; index += 1) {
      const spark = document.createElement("span");
      const angle = (Math.PI * 2 * index) / 4 + Math.random() * .45;
      const distance = 24 + Math.random() * 16;
      spark.className = "click-spark";
      spark.setAttribute("aria-hidden", "true");
      spark.style.left = `${event.clientX}px`;
      spark.style.top = `${event.clientY}px`;
      spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      document.body.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove(), { once:true });
      setTimeout(() => spark.remove(), 900);
    }
  }, { passive:true });
}
