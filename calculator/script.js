"use strict";

const $expr = document.getElementById("expression");
const $res = document.getElementById("result");
const $keys = document.getElementById("keys");

const state = {
  a: null,          // first operand (number)
  b: null,          // second operand (number)
  op: null,         // "+", "-", "*", "/"
  input: "0",       // current input string
  justEvaluated: false,
};

function formatNumber(n) {
  // Keep it simple and stable for student projects:
  // avoid trailing ".0", avoid scientific notation for small values.
  if (!Number.isFinite(n)) return "Error";
  const s = String(n);
  return s;
}

function currentInputNumber() {
  // Handles "." or "-."
  if (state.input === "." || state.input === "-.") return 0;
  return Number(state.input);
}

function setDisplay() {
  const exprParts = [];
  if (state.a !== null) exprParts.push(formatNumber(state.a));
  if (state.op) exprParts.push(state.op);
  if (state.b !== null) exprParts.push(formatNumber(state.b));
  $expr.textContent = exprParts.join(" ");
  $res.textContent = state.input;
}

function clearAll() {
  state.a = null;
  state.b = null;
  state.op = null;
  state.input = "0";
  state.justEvaluated = false;
  setDisplay();
}

function appendDigit(d) {
  if (state.justEvaluated) {
    // start a new number after equals when typing digits
    state.a = null; state.b = null; state.op = null;
    state.input = "0";
    state.justEvaluated = false;
  }

  if (state.input === "0") state.input = d;
  else state.input += d;
  setDisplay();
}

function addDot() {
  if (state.justEvaluated) {
    state.a = null; state.b = null; state.op = null;
    state.input = "0";
    state.justEvaluated = false;
  }

  if (!state.input.includes(".")) state.input += ".";
  setDisplay();
}

function toggleSign() {
  if (state.input === "0") return;
  if (state.input.startsWith("-")) state.input = state.input.slice(1);
  else state.input = "-" + state.input;
  setDisplay();
}

function percent() {
  const n = currentInputNumber();
  const v = n / 100;
  state.input = formatNumber(v);
  setDisplay();
}

function backspace() {
  if (state.justEvaluated) return;
  if (state.input.length <= 1 || (state.input.length === 2 && state.input.startsWith("-"))) {
    state.input = "0";
  } else {
    state.input = state.input.slice(0, -1);
  }
  setDisplay();
}

function compute(a, op, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? NaN : a / b;
    default: return NaN;
  }
}

function chooseOp(op) {
  const n = currentInputNumber();

  if (state.justEvaluated) state.justEvaluated = false;

  if (state.a === null) {
    state.a = n;
    state.op = op;
    state.input = "0";
    setDisplay();
    return;
  }

  if (state.op && state.input !== "0") {
    state.b = n;
    const out = compute(state.a, state.op, state.b);
    if (!Number.isFinite(out)) {
      state.input = "Error";
      state.a = null; state.b = null; state.op = null;
      setDisplay();
      return;
    }
    state.a = out;
    state.b = null;
    state.op = op;
    state.input = "0";
    setDisplay();
    return;
  }

  state.op = op;
  setDisplay();
}

function equals() {
  if (state.op === null || state.a === null) return;

  const n = currentInputNumber();
  const b = (state.input === "0" && state.b !== null) ? state.b : n;

  const out = compute(state.a, state.op, b);
  if (!Number.isFinite(out)) {
    state.input = "Error";
    state.a = null; state.b = null; state.op = null;
    setDisplay();
    return;
  }

  state.b = b;          // keep b for repeated equals
  state.a = out;
  state.input = formatNumber(out);
  state.justEvaluated = true;
  setDisplay();
}

$keys.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.digit) appendDigit(btn.dataset.digit);
  else if (btn.dataset.op) chooseOp(btn.dataset.op);
  else if (btn.dataset.action === "dot") addDot();
  else if (btn.dataset.action === "clear") clearAll();
  else if (btn.dataset.action === "sign") toggleSign();
  else if (btn.dataset.action === "percent") percent();
  else if (btn.dataset.action === "equals") equals();
});

document.addEventListener("keydown", (e) => {
  const k = e.key;

  if (k >= "0" && k <= "9") return appendDigit(k);
  if (k === ".") return addDot();
  if (k === "Enter" || k === "=") { e.preventDefault(); return equals(); }
  if (k === "Backspace") return backspace();
  if (k === "Escape") return clearAll();

  if (k === "+" || k === "-" || k === "*" || k === "/") return chooseOp(k);
});

clearAll();
