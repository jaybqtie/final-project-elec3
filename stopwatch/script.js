"use strict";

const $time = document.getElementById("time");
const $startPause = document.getElementById("startPause");
const $reset = document.getElementById("reset");

let running = false;
let startPerf = 0;   // performance.now() at start/resume
let elapsed = 0;     // accumulated elapsed ms when paused
let rafId = 0;

function fmt(ms) {
  const totalCs = Math.floor(ms / 10); // centiseconds
  const cs = totalCs % 100;

  const totalS = Math.floor(totalCs / 100);
  const s = totalS % 60;

  const totalM = Math.floor(totalS / 60);
  const m = totalM % 60;

  const h = Math.floor(totalM / 60);

  return (
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0") + "." +
    String(cs).padStart(2, "0")
  );
}

function render(ms) {
  $time.textContent = fmt(ms);
}

function tick() {
  if (!running) return; // safety
  const now = performance.now();
  const ms = elapsed + (now - startPerf);
  render(ms);
  rafId = requestAnimationFrame(tick);
}

function setButtons() {
  $startPause.textContent = running ? "Pause" : (elapsed > 0 ? "Resume" : "Start");

  // Reset should be usable only when NOT running and there is time to reset
  $reset.disabled = running || elapsed === 0;
}

function start() {
  if (running) return;
  running = true;
  startPerf = performance.now();

  // avoid double RAF
  if (!rafId) rafId = requestAnimationFrame(tick);

  setButtons();
}

function pause() {
  if (!running) return;
  running = false;

  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;

  elapsed += performance.now() - startPerf;
  render(elapsed);
  setButtons();
}

function reset() {
  if (running) return; // prevent resetting mid-run
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;

  startPerf = 0;
  elapsed = 0;
  render(0);
  setButtons();
}

$startPause.addEventListener("click", () => (running ? pause() : start()));
$reset.addEventListener("click", reset);

// Keyboard: Space = start/pause, R = reset
document.addEventListener("keydown", (e) => {
  const key = e.key;
  const code = e.code;

  const isSpace = key === " " || code === "Space";
  if (isSpace) {
    e.preventDefault();
    running ? pause() : start();
    return;
  }

  if (key.toLowerCase() === "r") {
    reset();
  }
});

// If the tab becomes hidden while running, keep time correct but stop heavy RAF
document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) {
    // convert current running time into elapsed, pause visual updates
    elapsed += performance.now() - startPerf;
    startPerf = performance.now();
    render(elapsed);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  } else if (!document.hidden && running && !rafId) {
    startPerf = performance.now();
    rafId = requestAnimationFrame(tick);
  }
});

render(0);
setButtons();
