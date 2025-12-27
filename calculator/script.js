"use strict";

const $expr = document.getElementById("expression");
const $res = document.getElementById("result");
const $keys = document.getElementById("keys");

const state = {
  a: null,               // first operand
  b: null,               // second operand (for repeated equals)
  op: null,              // "+", "-", "*", "/"
  input: "0",            // current input string
  justEvaluated: false,  // last action was equals
  error: false,
};

function isError() {
  return state.error || state.input === "Error";
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "Error";

  // Keep student-project simple but avoid 0.30000000004 type output
  const rounded = Math.round((n + Number.EPSILON) * 1e12) / 1e12;
  return String(rounded);
}

function currentInputNumber() {
  if (state.input === "." || state.input === "-.") return 0;
  return Number(state.input);
}

function setDisplay() {
  const exprParts = [];
  if (state.a !== null) exprParts.push(formatNumber(state.a));
  if (state.op) exprParts.push(state.op);
  if (state.b !== null && !state.justEvaluated) exprParts.push(formatNumber(state.b));

  $expr.textContent = exprParts.join(" ");
  $res.textContent = state.input;
}

function clearAll() {
  state.a = null;
  state.b = null;
  state.op = null;
  state.input = "0";
  state.justEvaluated = false;
  state.error = false;
  setDisplay();
}

function resetIfErrorOrAfterEqualsForNewTyping() {
  if (isError() || state.justEvaluated) {
    state.a = null;
    state.b = null;
    state.op = null;
    state.input = "0";
    state.justEvaluated = false;
    state.error = false;
  }
}

function appendDigit(d) {
  resetIfErrorOrAfterEqualsForNewTyping();

  // Avoid leading zeros like 0002
  if (state.input === "0") {
    state.input = d;
  } else if (state.input === "-0") {
    state.input = "-" + d;
  } else {
    state.input += d;
  }

  setDisplay();
}

function addDot() {
  resetIfErrorOrAfterEqualsForNewTyping();

  if (!state.input.includes(".")) {
    state.input += ".";
  }
  setDisplay();
}

function toggleSign() {
  if (isError()) return;

  if (state.input === "0" || state.input === "0.") return;

  if (state.input.startsWith("-")) state.input = state.input.slice(1);
  else state.input = "-" + state.input;

  setDisplay();
}

function percent() {
  if (isError()) return;

  const n = currentInputNumber();
  const v = n / 100;

  state.input = formatNumber(v);
  if (state.input === "Error") state.error = true;

  setDisplay();
}

function backspace() {
  if (isError()) return;

  if (state.justEvaluated) return;

  if (
    state.input.length <= 1 ||
    (state.input.length === 2 && state.input.startsWith("-"))
  ) {
    state.input = "0";
  } else {
    state.input = state.input.slice(0, -1);
    // If user ends with "-" only
    if (state.input === "-") state.input = "0";
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
  if (isError()) return;

  const n = currentInputNumber();

  // If user taps op right after equals, continue from result
  if (state.justEvaluated) {
    state.justEvaluated = false;
    state.b = null;
  }

  if (state.a === null) {
    state.a = n;
    state.op = op;
    state.input = "0";
    setDisplay();
    return;
  }

  if (!Number.isFinite(result)) {
      this.input = "Error";
      this.hasError = true;
      this.updateDisplay();
      return;
    }

  // If there is already an op and user has typed a number, compute first (chaining)
  if (state.op && state.input !== "0") {
    state.b = n;
    const out = compute(state.a, state.op, state.b);

    if (!Number.isFinite(out)) {
      state.input = "Error";
      state.error = true;
      state.a = null;
      state.b = null;
      state.op = null;
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

  // Allow changing operator without entering next number
  state.op = op;
  setDisplay();
}

function equals() {
  if (isError()) return;
  if (state.op === null || state.a === null) return;

  const n = currentInputNumber();

  // If repeated equals, reuse stored b; otherwise set b from input
  const b = state.justEvaluated
    ? (state.b ?? n)
    : n;

  const out = compute(state.a, state.op, b);

  if (!Number.isFinite(out)) {
    state.input = "Error";
    state.error = true;
    state.a = null;
    state.b = null;
    state.op = null;
    setDisplay();
    return;
  }

  state.b = b;
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
  else if (btn.dataset.action === "backspace") backspace();
  else if (btn.dataset.action === "sign") toggleSign();
  else if (btn.dataset.action === "percent") percent();
  else if (btn.dataset.action === "equals") equals();
});

document.addEventListener("keydown", (e) => {
  const k = e.key;

  if (k >= "0" && k <= "9") return appendDigit(k);
  if (k === ".") return addDot();
  if (k === "Enter" || k === "=") { e.preventDefault(); return equals(); }
  if (k === "Backspace" || k === "Delete") return backspace();
  if (k === "Escape") return clearAll();

  if (k === "+" || k === "-" || k === "*" || k === "/") return chooseOp(k);
});

clearAll();
