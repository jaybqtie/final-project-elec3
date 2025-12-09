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

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  const cc = String(cs).padStart(2, "0");

  return `${hh}:${mm}:${ss}.${cc}`;
}

function tick() {
  const now = performance.now();
  const ms = elapsed + (now - startPerf);
  $time.textContent = fmt(ms);
  rafId = requestAnimationFrame(tick);
}

function setButtons() {
  $startPause.textContent = running ? "Pause" : (elapsed > 0 ? "Resume" : "Start");
  $reset.disabled = running ? false : (elapsed === 0);
}

function start() {
  if (running) return;
  running = true;
  startPerf = performance.now();
  rafId = requestAnimationFrame(tick);
  setButtons();
}

function pause() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(rafId);
  rafId = 0;
  elapsed += performance.now() - startPerf;
  setButtons();
}

function reset() {
  cancelAnimationFrame(rafId);
  rafId = 0;
  running = false;
  startPerf = 0;
  elapsed = 0;
  $time.textContent = "00:00:00.00";
  setButtons();
}

$startPause.addEventListener("click", () => (running ? pause() : start()));
$reset.addEventListener("click", reset);

// Keyboard shortcuts: Space = start/pause, R = reset
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === " ") { e.preventDefault(); running ? pause() : start(); }
  if (k === "r") reset();
});

setButtons();
