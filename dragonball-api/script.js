"use strict";

const API_BASE = "https://dragonball-api.com/api/characters";
const PAGE_LIMIT = 12;

const els = {
  nameInput: document.getElementById("nameInput"),
  raceSelect: document.getElementById("raceSelect"),
  minKiInput: document.getElementById("minKiInput"),
  maxKiInput: document.getElementById("maxKiInput"),
  sortSelect: document.getElementById("sortSelect"),
  searchBtn: document.getElementById("searchBtn"),
  resetBtn: document.getElementById("resetBtn"),
  loadingSpinner: document.getElementById("loadingSpinner"),
  results: document.getElementById("resultsContainer"),
  resultInfo: document.getElementById("resultInfo"),
  status: document.getElementById("status"),
  errorBox: document.getElementById("errorBox"),
  loadMoreBtn: document.getElementById("loadMoreBtn"),
  themeToggle: document.getElementById("themeToggle"),
  viewToggle: document.getElementById("viewToggle"),
};

const STORAGE_FAVS = "db_favorites_v1";
const STORAGE_THEME = "db_theme_v1";

let allLoaded = [];      // everything fetched so far
let shown = [];          // after filter/sort
let page = 1;            // API page
let canLoadMore = true;  // based on API response
let viewMode = "all";    // "all" | "favorites"
let _spinnerShownAt = 0;

function setStatus(msg) { els.status.textContent = msg || ""; }
function showError(msg) {
  els.errorBox.textContent = msg || "Something went wrong.";
  els.errorBox.classList.remove("hidden");
}
function clearError() {
  els.errorBox.textContent = "";
  els.errorBox.classList.add("hidden");
}

function setLoading(isLoading, msg = "") {
  setStatus(msg);
  els.searchBtn.disabled = isLoading;
  els.resetBtn.disabled = isLoading;
  els.loadMoreBtn.disabled = isLoading;
  if (els.loadingSpinner) {
    if (isLoading) {
      els.loadingSpinner.classList.remove("hidden");
      els.loadingSpinner.setAttribute("aria-hidden", "false");
      _spinnerShownAt = Date.now();
    } else {
      const elapsed = Date.now() - (_spinnerShownAt || 0);
      const remaining = Math.max(0, 1000 - elapsed);
      if (remaining > 0) {
        setTimeout(() => {
          if (els.loadingSpinner) {
            els.loadingSpinner.classList.add("hidden");
            els.loadingSpinner.setAttribute("aria-hidden", "true");
          }
        }, remaining);
      } else {
        els.loadingSpinner.classList.add("hidden");
        els.loadingSpinner.setAttribute("aria-hidden", "true");
      }
    }
  }
}

function parseKi(value) {
  if (value === null || value === undefined) return 0;
  const numeric = String(value).replace(/[^\d]/g, "");
  return Number(numeric || 0);
}

function getFavs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_FAVS) || "[]");
  } catch {
    return [];
  }
}

function setFavs(list) {
  localStorage.setItem(STORAGE_FAVS, JSON.stringify(list));
}

function isFav(id) {
  return getFavs().includes(id);
}

function toggleFav(id) {
  const favs = getFavs();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(id);
  setFavs(favs);
}

async function fetchPage(p) {
  const url = `${API_BASE}?page=${p}&limit=${PAGE_LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function loadInitial() {
  clearError();
  els.results.innerHTML = "";
  els.resultInfo.textContent = "";
  allLoaded = [];
  page = 1;
  canLoadMore = true;

  await loadMore();
}

async function loadMore() {
  if (!canLoadMore) return;

  try {
    setLoading(true, "Loading characters…");

    const data = await fetchPage(page);
    const items = data.items || [];

    allLoaded = allLoaded.concat(items);

    // Some APIs provide links/meta; if not, we infer by returned length.
    if (items.length < PAGE_LIMIT) canLoadMore = false;

    page += 1;

    applyFiltersAndRender();
    setLoading(false, "");
  } catch (err) {
    console.error(err);
    setLoading(false, "");
    showError(err.message || "Failed to load characters.");
  }
}

function validateFilters() {
  const minKi = els.minKiInput.value.trim();
  const maxKi = els.maxKiInput.value.trim();
  if (minKi && Number(minKi) < 0) return { ok: false, message: "Min KI must be 0 or higher." };
  if (maxKi && Number(maxKi) < 0) return { ok: false, message: "Max KI must be 0 or higher." };
  if (minKi && maxKi && Number(minKi) > Number(maxKi)) {
    return { ok: false, message: "Min KI cannot be greater than Max KI." };
  }
  return { ok: true };
}

function filterList(list) {
  const nameQuery = els.nameInput.value.toLowerCase().trim();
  const raceQuery = els.raceSelect.value.toLowerCase().trim();
  const minKiQuery = els.minKiInput.value.trim();
  const maxKiQuery = els.maxKiInput.value.trim();

  const favSet = new Set(getFavs());

  return list.filter((c) => {
    if (viewMode === "favorites" && !favSet.has(c.id)) return false;

    const name = (c.name || "").toLowerCase();
    const race = (c.race || "").toLowerCase();
    const ki = parseKi(c.ki);

    if (nameQuery && !name.includes(nameQuery)) return false;
    if (raceQuery && race !== raceQuery) return false;

    if (minKiQuery && ki < Number(minKiQuery)) return false;
    if (maxKiQuery && ki > Number(maxKiQuery)) return false;

    return true;
  });
}

function sortList(list) {
  const mode = els.sortSelect.value;

  const copy = [...list];
  copy.sort((a, b) => {
    if (mode === "id-asc") return (a.id ?? 0) - (b.id ?? 0);
    if (mode === "id-desc") return (b.id ?? 0) - (a.id ?? 0);

    if (mode === "name-asc") return String(a.name || "").localeCompare(String(b.name || ""));
    if (mode === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""));

    if (mode === "ki-asc") return parseKi(a.ki) - parseKi(b.ki);
    if (mode === "ki-desc") return parseKi(b.ki) - parseKi(a.ki);

    return 0;
  });

  return copy;
}

function applyFiltersAndRender() {
  clearError();

  const v = validateFilters();
  if (!v.ok) {
    showError(v.message);
    return;
  }

  shown = sortList(filterList(allLoaded));
  render(shown);

  const favCount = getFavs().length;
  const viewLabel = viewMode === "favorites" ? "Favorites" : "All";

  els.resultInfo.textContent =
    `${shown.length} shown • ${allLoaded.length} loaded • ${favCount} favorite(s) • View: ${viewLabel}`;

  // Show load more only on "All" view (favorites is local)
  if (viewMode === "all" && canLoadMore) els.loadMoreBtn.classList.remove("hidden");
  else els.loadMoreBtn.classList.add("hidden");
}

function render(list) {
  if (!list.length) {
    els.results.innerHTML = `<div class="error-box">No characters found.</div>`;
    return;
  }

  els.results.innerHTML = list.map((c) => {
    const fav = isFav(c.id);
    const ki = c.ki ?? "N/A";
    const maxKi = c.maxKi ?? "N/A";

    return `
      <article class="char" data-id="${c.id}">
        <div class="char-top">
          ${c.image ? `<img class="avatar" src="${c.image}" alt="${c.name}" />` : `<div class="avatar"></div>`}
          <div style="flex:1;">
            <div class="title">
              <p class="name">${c.name || "Unknown"}</p>
              <span class="badge">#${c.id}</span>
            </div>
            <div class="meta">
              <div><span>Race:</span> ${c.race || "Unknown"} • <span>Gender:</span> ${c.gender || "—"}</div>
              <div class="kiline"><span>KI:</span> ${ki} • <span>Max:</span> ${maxKi}</div>
            </div>
          </div>
        </div>

        <button class="btn btn--fn fav" data-action="fav">
          ${fav ? "★ Favorited" : "☆ Add to Favorites"}
        </button>
      </article>
    `;
  }).join("");
}

// Theme
function loadTheme() {
  const saved = localStorage.getItem(STORAGE_THEME);
  const theme = saved === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  els.themeToggle.textContent = `Theme: ${theme === "light" ? "Light" : "Dark"}`;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(STORAGE_THEME, next);
  els.themeToggle.textContent = `Theme: ${next === "light" ? "Light" : "Dark"}`;
}

// View toggle (All vs Favorites)
function toggleView() {
  viewMode = viewMode === "all" ? "favorites" : "all";
  els.viewToggle.textContent = `View: ${viewMode === "all" ? "All" : "Favorites"}`;
  applyFiltersAndRender();
}

// Events
els.searchBtn.addEventListener("click", () => {
  // Show spinner while applying filters/rendering (ensures at least 1s visible)
  setLoading(true, "Searching...");
  try {
    applyFiltersAndRender();
  } finally {
    setLoading(false, "");
  }
});

els.resetBtn.addEventListener("click", () => {
  els.nameInput.value = "";
  els.raceSelect.value = "";
  els.minKiInput.value = "";
  els.maxKiInput.value = "";
  els.sortSelect.value = "id-asc";
  viewMode = "all";
  els.viewToggle.textContent = "View: All";
  applyFiltersAndRender();
});

els.loadMoreBtn.addEventListener("click", loadMore);

els.themeToggle.addEventListener("click", toggleTheme);
els.viewToggle.addEventListener("click", toggleView);

// Delegated favorite click
els.results.addEventListener("click", (e) => {
  const btn = e.target.closest('button[data-action="fav"]');
  if (!btn) return;

  const card = e.target.closest(".char");
  if (!card) return;

  const id = Number(card.getAttribute("data-id"));
  if (!Number.isFinite(id)) return;

  toggleFav(id);

  // if we're in favorites view and user removed one, re-filter
  applyFiltersAndRender();
});

// Init
loadTheme();
loadInitial();
