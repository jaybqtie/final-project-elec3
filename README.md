# JS Mini Projects

Small, self-contained front-end builds written in vanilla HTML/CSS/JS. Each project lives in its own folder and can be opened directly in a browser—no build tooling required.

## Projects
- **Calculator** (`calculator/`) — desktop-style calculator with keyboard support (0–9, + - * /, Enter, Backspace, Esc) and animated glassy UI.
- **Dragon Ball API Viewer** (`dragonball-api/`) — browse characters from dragonball-api.com with filtering, sorting, favorites, pagination, and theme toggle.
- **Weather Dashboard** (`weather-api/`) — search cities, pick a location match, view current conditions and a 5-day snapshot using OpenWeather.
- **Stopwatch** (`stopwatch/`) — start/stop/reset stopwatch with lap list, built on a simple JS timer loop.

## Quick start
1) Clone or download this repo.
2) Open any project folder.
3) Open `index.html` in your browser. (No build step needed.)

## Notes by project
- **Calculator**: Click buttons or use the keyboard; `AC` clears, `⌫` deletes last, `±` toggles sign.
- **Dragon Ball API Viewer**: Uses the public `https://dragonball-api.com/api/characters` endpoint. Favorites are stored in `localStorage`. "Load more" fetches paginated results.
- **Weather Dashboard**: Uses OpenWeather Geocoding + Current Weather + 5-day Forecast. Replace `API_KEY` at the top of `weather-api/script.js` with your own key for production use.
- **Stopwatch**: Buttons control start/stop/reset and lap capture; laps list below. Runs fully client-side.

## Styling
All apps share a consistent glassmorphism-inspired UI with animated gradient glows and a subtle moving grid background, defined in each `style.css`.

## Compatibility
Tested in modern Chromium-based browsers and Firefox. Mobile layouts rely on responsive grids and should adapt to small screens.
