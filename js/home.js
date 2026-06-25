const homeDefaultLanguage = "en";
const homeLanguageManifestPath = "locales/languages.json";
const homeLanguageStorageKey = "zinzin_home_language_v2";
const homeRtlLanguages = new Set(["ar", "fa", "he", "ur"]);

const homeNavToggle = document.querySelector(".home-nav-toggle");
const homeNavLinks = document.querySelector("[data-home-nav-links]");
const homeLanguageSelect = document.querySelector("#homeLanguageSelect");

let homeStrings = {};
let homeLanguages = [
  {
    code: "en",
    name: "English",
    file: "en.json"
  }
];

initHomeNavigation();
initHomeLocalization();

function initHomeNavigation() {
  if (!homeNavToggle || !homeNavLinks) {
    return;
  }

  homeNavToggle.addEventListener("click", () => {
    const isOpen = homeNavLinks.classList.toggle("is-open");
    homeNavToggle.setAttribute("aria-expanded", String(isOpen));
  });

  homeNavLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      homeNavLinks.classList.remove("is-open");
      homeNavToggle.setAttribute("aria-expanded", "false");
    }
  });
}

async function initHomeLocalization() {
  const manifest = await loadHomeJson(homeLanguageManifestPath);

  if (manifest && Array.isArray(manifest.languages) && manifest.languages.length > 0) {
    homeLanguages = manifest.languages.filter((language) => language.code && language.file);
  }

  const manifestDefault = manifest && manifest.default ? manifest.default : homeDefaultLanguage;
  const savedLanguage = localStorage.getItem(homeLanguageStorageKey);
  const initialLanguage = getHomeLanguageConfig(savedLanguage) ? savedLanguage : manifestDefault;

  buildHomeLanguageSelect(initialLanguage);
  await applyHomeLanguage(initialLanguage);
}

function buildHomeLanguageSelect(selectedCode) {
  if (!homeLanguageSelect) {
    return;
  }

  homeLanguageSelect.innerHTML = "";

  homeLanguages.forEach((language) => {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = language.name;
    option.selected = language.code === selectedCode;
    homeLanguageSelect.appendChild(option);
  });

  homeLanguageSelect.addEventListener("change", async () => {
    await applyHomeLanguage(homeLanguageSelect.value);
  });
}

async function applyHomeLanguage(languageCode) {
  const config = getHomeLanguageConfig(languageCode) || getHomeLanguageConfig(homeDefaultLanguage) || homeLanguages[0];

  if (!config) {
    return;
  }

  const strings = await loadHomeJson(`locales/${config.file}`);

  if (!strings) {
    console.warn(`Localization file could not be loaded: locales/${config.file}`);
    return;
  }

  homeStrings = strings;
  document.documentElement.lang = config.code;
  document.documentElement.dir = config.dir || (homeRtlLanguages.has(config.code) ? "rtl" : "ltr");
  localStorage.setItem(homeLanguageStorageKey, config.code);

  if (homeLanguageSelect) {
    homeLanguageSelect.value = config.code;
  }

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = homeTranslate(element.dataset.i18n);
    if (value) {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    const pairs = element.dataset.i18nAttr.split(";");
    pairs.forEach((pair) => {
      const [attribute, key] = pair.split(":").map((part) => part && part.trim());
      if (!attribute || !key) {
        return;
      }

      const value = homeTranslate(key);
      if (value) {
        element.setAttribute(attribute, value);
      }
    });
  });

  const title = homeTranslate("meta.title");
  if (title) {
    document.title = title;
  }
}

function getHomeLanguageConfig(languageCode) {
  if (!languageCode) {
    return null;
  }

  return homeLanguages.find((language) => language.code === languageCode) || null;
}

async function loadHomeJson(path) {
  const bundledJson = getHomeBundledJson(path);
  if (bundledJson) {
    return bundledJson;
  }

  try {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Failed to load ${path}.`, error);
    return null;
  }
}

function homeTranslate(key) {
  return homeStrings[key] || "";
}

function getHomeBundledJson(path) {
  const bundle = window.zinzinHomeLocaleBundle;
  if (!bundle) {
    return null;
  }

  if (path === homeLanguageManifestPath) {
    return bundle.manifest || null;
  }

  const fileName = path.split("/").pop();
  return bundle.locales && fileName ? bundle.locales[fileName] || null : null;
}
