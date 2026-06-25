const defaultLanguage = "en";
const languageManifestPath = "locales/languages.json";
const languageStorageKey = "zinzin_wiki_language_v2";
const rtlLanguages = new Set(["ar", "fa", "he", "ur"]);
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("[data-nav-links]");
const searchInput = document.querySelector("#wikiSearch");
const languageSelect = document.querySelector("#languageSelect");
const searchableItems = Array.from(document.querySelectorAll("[data-search-key]"));

let activeStrings = {};
let availableLanguages = [
  {
    code: "en",
    name: "English",
    file: "en.json"
  }
];

initNavigation();
initSearch();
initLocalization();

function initNavigation() {
  if (!navToggle || !navLinks) {
    return;
  }

  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initSearch() {
  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", filterWikiItems);
}

async function initLocalization() {
  const manifest = await loadJson(languageManifestPath);

  if (manifest && Array.isArray(manifest.languages) && manifest.languages.length > 0) {
    availableLanguages = manifest.languages.filter((language) => language.code && language.file);
  }

  const manifestDefault = manifest && manifest.default ? manifest.default : defaultLanguage;
  const savedLanguage = localStorage.getItem(languageStorageKey);
  const initialLanguage = getLanguageConfig(savedLanguage) ? savedLanguage : manifestDefault;

  buildLanguageSelect(initialLanguage);
  await applyLanguage(initialLanguage);
}

function buildLanguageSelect(selectedCode) {
  if (!languageSelect) {
    return;
  }

  languageSelect.innerHTML = "";

  availableLanguages.forEach((language) => {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = language.name;
    option.selected = language.code === selectedCode;
    languageSelect.appendChild(option);
  });

  languageSelect.addEventListener("change", async () => {
    await applyLanguage(languageSelect.value);
  });
}

async function applyLanguage(languageCode) {
  const config = getLanguageConfig(languageCode) || getLanguageConfig(defaultLanguage) || availableLanguages[0];

  if (!config) {
    return;
  }

  const strings = await loadJson(`locales/${config.file}`);

  if (!strings) {
    console.warn(`Localization file could not be loaded: locales/${config.file}`);
    return;
  }

  activeStrings = strings;
  document.documentElement.lang = config.code;
  document.documentElement.dir = config.dir || (rtlLanguages.has(config.code) ? "rtl" : "ltr");
  localStorage.setItem(languageStorageKey, config.code);

  if (languageSelect) {
    languageSelect.value = config.code;
  }

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = t(element.dataset.i18n);
    if (value) {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    const pairs = element.dataset.i18nAttr.split(",");
    pairs.forEach((pair) => {
      const [attribute, key] = pair.split(":").map((part) => part && part.trim());
      if (!attribute || !key) {
        return;
      }

      const value = t(key);
      if (value) {
        element.setAttribute(attribute, value);
      }
    });
  });

  const title = t("meta.title");
  if (title) {
    document.title = title;
  }

  filterWikiItems();
}

function getLanguageConfig(languageCode) {
  if (!languageCode) {
    return null;
  }

  return availableLanguages.find((language) => language.code === languageCode) || null;
}

async function loadJson(path) {
  const bundledJson = getBundledJson(path);
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

function filterWikiItems() {
  if (!searchInput) {
    return;
  }

  const query = normalize(searchInput.value);

  searchableItems.forEach((item) => {
    const searchKey = item.dataset.searchKey;
    const translatedKeywords = searchKey ? t(searchKey) : "";
    const text = normalize(`${item.textContent || ""} ${translatedKeywords}`);
    item.classList.toggle("is-hidden", query.length > 0 && !text.includes(query));
  });
}

function t(key) {
  return activeStrings[key] || "";
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getBundledJson(path) {
  const bundle = window.zinzinWikiLocaleBundle;
  if (!bundle) {
    return null;
  }

  if (path === languageManifestPath) {
    return bundle.manifest || null;
  }

  const fileName = path.split("/").pop();
  return bundle.locales && fileName ? bundle.locales[fileName] || null : null;
}
