const API_KEY = "YOUR_API_KEY_HERE";

// APIs (BONUS: multiple API calls combined)
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// DOM
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const statusEl = document.getElementById("status");
const errorBox = document.getElementById("errorBox");
const placeSelect = document.getElementById("placeSelect");
const themeToggle = document.getElementById("themeToggle");
const loadingSpinner = document.getElementById("loadingSpinner");

const resultsContainer = document.getElementById("resultsContainer");
const cityNameEl = document.getElementById("cityName");
const countryEl = document.getElementById("country");
const descriptionEl = document.getElementById("description");
const tempEl = document.getElementById("temp");
const tempUnitEl = document.getElementById("tempUnit");
const feelsLikeEl = document.getElementById("feelsLike");
const feelsUnitEl = document.getElementById("feelsUnit");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const windUnitEl = document.getElementById("windUnit");

const forecastGrid = document.getElementById("forecastGrid");
const unitCBtn = document.getElementById("unitC");
const unitFBtn = document.getElementById("unitF");
const currentIconEl = document.getElementById("currentIcon");
const recentSearchesEl = document.getElementById("recentSearches");
const recentListEl = document.getElementById("recentList");

// State
let units = "C"; // C or F
let lastCurrent = null; // cache last fetched current weather (metric)
let lastForecast = null; // cache last fetched forecast (metric)
let lastPlace = null; // cache last place for recent searches
let _spinnerShownAt = 0;

// Recent Searches Feature
const MAX_RECENT = 5;

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem("recentSearches") || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(place) {
  const recent = getRecentSearches();
  const searchKey = `${place.name}, ${place.country}`;
  
  // Remove duplicate if exists
  const filtered = recent.filter(r => r.searchKey !== searchKey);
  
  // Add to beginning
  filtered.unshift({ searchKey, place });
  
  // Keep only MAX_RECENT items
  const trimmed = filtered.slice(0, MAX_RECENT);
  localStorage.setItem("recentSearches", JSON.stringify(trimmed));
  renderRecentSearches();
}

function removeRecentSearch(searchKey) {
  const recent = getRecentSearches().filter(r => r.searchKey !== searchKey);
  localStorage.setItem("recentSearches", JSON.stringify(recent));
  renderRecentSearches();
}

function renderRecentSearches() {
  const recent = getRecentSearches();
  
  if (recent.length === 0) {
    recentSearchesEl.classList.add("hidden");
    return;
  }
  
  recentSearchesEl.classList.remove("hidden");
  recentListEl.innerHTML = recent.map(({ searchKey, place }) => `
    <div class="recent-item" data-place='${JSON.stringify(place)}'>
      <span>📍 ${searchKey}</span>
      <span class="recent-remove" data-key="${searchKey}">×</span>
    </div>
  `).join("");
  
  // Add event listeners to recent items
  document.querySelectorAll(".recent-item").forEach(item => {
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("recent-remove")) {
        e.stopPropagation();
        removeRecentSearch(e.target.dataset.key);
      } else {
        const place = JSON.parse(item.dataset.place);
        fetchForPlace(place);
      }
    });
  });
}

// UI helpers
function setLoading(isLoading, msg = "") {
  statusEl.textContent = msg;
  searchBtn.disabled = isLoading;
  cityInput.disabled = isLoading;
  placeSelect.disabled = isLoading;
  if (loadingSpinner) {
    if (isLoading) {
      loadingSpinner.classList.remove("hidden");
      loadingSpinner.setAttribute("aria-hidden", "false");
      _spinnerShownAt = Date.now();
    } else {
      const elapsed = Date.now() - (_spinnerShownAt || 0);
      const remaining = Math.max(0, 1000 - elapsed);
      if (remaining > 0) {
        setTimeout(() => {
          if (loadingSpinner) {
            loadingSpinner.classList.add("hidden");
            loadingSpinner.setAttribute("aria-hidden", "true");
          }
        }, remaining);
      } else {
        loadingSpinner.classList.add("hidden");
        loadingSpinner.setAttribute("aria-hidden", "true");
      }
    }
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function hideResults() {
  resultsContainer.classList.add("hidden");
  forecastGrid.innerHTML = "";
}

function hidePlaceSelect() {
  placeSelect.classList.add("hidden");
  placeSelect.innerHTML = "";
}

function describeGeoError(err) {
  if (!err) return "Unable to get your location.";
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Permission denied. Allow location to load your local weather.";
    case err.POSITION_UNAVAILABLE:
      return "Location unavailable. Please try again.";
    case err.TIMEOUT:
      return "Location request timed out. Try again.";
    default:
      return "Failed to get your location.";
  }
}

function validateCityInput(value) {
  const city = value.trim();
  if (!city) return { ok: false, message: "Please enter a city/province name." };
  if (city.length < 2) return { ok: false, message: "Please enter at least 2 characters." };

  const allowed = /^[a-zA-ZÀ-ž\s.,'-]+$/;
  if (!allowed.test(city)) return { ok: false, message: "Please use letters and common punctuation only." };

  return { ok: true, city };
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let extra = "";
    try {
      const data = await res.json();
      if (data?.message) extra = ` (${data.message})`;
    } catch {}
    throw new Error(`Request failed: ${res.status} ${res.statusText}${extra}`);
  }
  return res.json();
}

// Geocode: return up to 5 candidate locations
async function geocodeCityOptions(city) {
  const url = `${GEO_URL}?q=${encodeURIComponent(city)}&limit=5&appid=${API_KEY}`;
  const data = await fetchJSON(url);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Location not found. Check spelling.");
  }
  return data;
}

async function getCurrentWeather(lat, lon) {
  const url = `${WEATHER_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  return fetchJSON(url);
}

async function getForecast(lat, lon) {
  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  return fetchJSON(url);
}

function formatPlace(p) {
  const state = p.state ? `, ${p.state}` : "";
  return `${p.name}${state}, ${p.country}`;
}

function populatePlaceSelect(places) {
  placeSelect.innerHTML = "";
  for (const p of places) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify({
      lat: p.lat,
      lon: p.lon,
      name: p.name,
      state: p.state || "",
      country: p.country || "",
    });
    opt.textContent = formatPlace(p);
    placeSelect.appendChild(opt);
  }
  placeSelect.classList.remove("hidden");
}

function getSelectedPlace() {
  return JSON.parse(placeSelect.value);
}

// Render current weather
function showWeather(data, place) {
  lastCurrent = data;
  lastPlace = place;
  
  const city = place?.name || data.name || "Unknown";
  const state = place?.state ? `, ${place.state}` : "";
  const country = place?.country || data.sys?.country || "";

  const weather0 = data.weather?.[0];
  const description = weather0?.description || "N/A";
  const tempMetric = data.main?.temp ?? 0;
  const feelsMetric = data.main?.feels_like ?? 0;
  const humidity = data.main?.humidity ?? 0;
  const windMetric = data.wind?.speed ?? 0;
  
  // Convert based on units
  const temp = Math.round(units === "C" ? tempMetric : (tempMetric * 9/5 + 32));
  const feelsLike = Math.round(units === "C" ? feelsMetric : (feelsMetric * 9/5 + 32));
  const wind = units === "C" ? windMetric : (windMetric * 2.23694);

  cityNameEl.textContent = `${city}${state}`;
  countryEl.textContent = country;
  descriptionEl.textContent = description;
  tempEl.textContent = temp;
  feelsLikeEl.textContent = feelsLike;
  humidityEl.textContent = humidity;
  windEl.textContent = Math.round(wind);

  // Update unit symbols
  const unitSymbol = units === "C" ? "°C" : "°F";
  tempUnitEl.textContent = unitSymbol;
  feelsUnitEl.textContent = unitSymbol;
  windUnitEl.textContent = units === "C" ? "m/s" : "mph";

  // Weather icon
  if (currentIconEl && weather0?.icon) {
    currentIconEl.src = `https://openweathermap.org/img/wn/${weather0.icon}@2x.png`;
    currentIconEl.alt = description;
  }

  resultsContainer.classList.remove("hidden");
  saveRecentSearch(place);
}

// Forecast helpers (3-hour intervals)
function pickDailyFrom3HourList(list) {
  const byDay = new Map();

  for (const item of list) {
    const dt = new Date(item.dt * 1000);
    const dayKey = dt.toISOString().slice(0, 10);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey).push(item);
  }

  const days = Array.from(byDay.entries()).slice(0, 5);
  const chosen = [];

  for (const [, items] of days) {
    let best = items[0];
    let bestDist = Infinity;

    for (const it of items) {
      const d = new Date(it.dt * 1000);
      const dist = Math.abs(d.getUTCHours() - 12);
      if (dist < bestDist) {
        bestDist = dist;
        best = it;
      }
    }
    chosen.push(best);
  }

  return chosen;
}

function formatDayLabel(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function showForecast(forecastData) {
  lastForecast = forecastData;
  const list = forecastData.list || [];
  if (!list.length) return;

  const daily = pickDailyFrom3HourList(list);
  forecastGrid.innerHTML = "";

  for (const item of daily) {
    const tMetric = item.main?.temp ?? 0;
    const temp = Math.round(units === "C" ? tMetric : (tMetric * 9/5 + 32));
    const w0 = item.weather?.[0];
    const desc = w0?.description || "N/A";
    const day = formatDayLabel(item.dt);

    const itemEl = document.createElement("div");
    itemEl.className = "forecast-item";
    itemEl.innerHTML = `
      <div class="forecast-day">${day}</div>
      <div class="forecast-icon-temp">
        <img class="forecast-icon" alt="${desc}" src="${w0?.icon ? `https://openweathermap.org/img/wn/${w0.icon}.png` : ''}" />
        <span class="forecast-temp">${temp}°${units}</span>
      </div>
      <div class="forecast-desc">${desc}</div>
    `;
    forecastGrid.appendChild(itemEl);
  }
}

// Run fetch for a selected place
async function fetchForPlace(place) {
  hideResults();
  clearError();

  try {
    setLoading(true, "Loading weather...");

    const current = await getCurrentWeather(place.lat, place.lon);
    showWeather(current, place);

    setLoading(true, "Loading 5-day forecast...");
    const forecast = await getForecast(place.lat, place.lon);
    showForecast(forecast);

    setLoading(false, "");
  } catch (err) {
    console.error(err);
    setLoading(false, "");
    showError(err.message || "Failed to fetch weather.");
  }
}

async function fetchForCoords(lat, lon) {
  hidePlaceSelect();
  hideResults();
  clearError();

  try {
    setLoading(true, "Loading local weather...");

    const current = await getCurrentWeather(lat, lon);
    const place = {
      lat,
      lon,
      name: current.name || "Your Location",
      state: "",
      country: current.sys?.country || "",
    };

    showWeather(current, place);

    setLoading(true, "Loading 5-day forecast...");
    const forecast = await getForecast(lat, lon);
    showForecast(forecast);

    setLoading(false, "");
  } catch (err) {
    console.error(err);
    setLoading(false, "");
    showError(err.message || "Unable to load local weather.");
  }
}

// Main search
async function runSearch() {
  clearError();
  hideResults();
  hidePlaceSelect();

  const check = validateCityInput(cityInput.value);
  if (!check.ok) {
    showError(check.message);
    return;
  }

  try {
    setLoading(true, "Searching location...");

    const places = await geocodeCityOptions(check.city);
    populatePlaceSelect(places);

    setLoading(false, "");
    await fetchForPlace(getSelectedPlace());
  } catch (err) {
    console.error(err);
    setLoading(false, "");
    showError(err.message || "Failed to find location.");
  }
}

function requestGeolocation() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported in this browser.");
    return;
  }

  clearError();
  hidePlaceSelect();
  setLoading(true, "Requesting location permission...");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      fetchForCoords(latitude, longitude);
    },
    (err) => {
      setLoading(false, "");
      showError(describeGeoError(err));
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

// Theme toggle
function initTheme() {
  const saved = localStorage.getItem("weather_theme");
  const theme = saved || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}
function setUnits(next) {
  if (units === next) return;
  units = next;
  
  // Update button states
  unitCBtn.classList.toggle("active", units === "C");
  unitFBtn.classList.toggle("active", units === "F");
  unitCBtn.setAttribute("aria-pressed", String(units === "C"));
  unitFBtn.setAttribute("aria-pressed", String(units === "F"));

  // Re-render using cached data if available
  if (lastCurrent && lastPlace) {
    showWeather(lastCurrent, lastPlace);
  }
  if (lastForecast) {
    showForecast(lastForecast);
  }
}

function updateThemeIcon(theme) {
  themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("weather_theme", next);
  updateThemeIcon(next);
}

// Events
searchBtn.addEventListener("click", runSearch);

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

placeSelect.addEventListener("change", () => {
  fetchForPlace(getSelectedPlace());
});

themeToggle.addEventListener("click", toggleTheme);
unitCBtn?.addEventListener("click", () => setUnits("C"));
unitFBtn?.addEventListener("click", () => setUnits("F"));
geoBtn?.addEventListener("click", requestGeolocation);

// Initialize
initTheme();
setUnits("C");
renderRecentSearches();

// Attempt to get current location on load (asks permission first)
if (navigator.geolocation) {
  try {
    navigator.permissions?.query({ name: "geolocation" }).then((res) => {
      if (res?.state === "denied") return;
      requestGeolocation();
    }).catch(() => requestGeolocation());
  } catch {
    requestGeolocation();
  }
}
