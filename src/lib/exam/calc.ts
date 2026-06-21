/**
 * Safe scientific-expression evaluator for the in-exam calculator.
 *
 * No `eval` / `Function`: a tokenizer → shunting-yard (infix→RPN) → RPN
 * evaluator. Supports + - * / ^ %, parentheses, unary minus, the constants
 * pi/e, and the functions sin cos tan asin acos atan ln log sqrt abs exp.
 * Trig honours a degree/radian flag.
 */

type Tok =
  | { t: "num"; v: number }
  | { t: "op"; v: string }
  | { t: "fn"; v: string }
  | { t: "lp" }
  | { t: "rp" };

const FUNCS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan",
  "ln", "log", "sqrt", "abs", "exp",
]);

// Binary/unary operator precedence + associativity.
const PREC: Record<string, number> = { "u-": 5, "^": 4, "*": 3, "/": 3, "%": 3, "+": 2, "-": 2 };
const RIGHT = new Set(["^", "u-"]);

function tokenize(input: string): Tok[] {
  const s = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/−/g, "-");
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const v = parseFloat(s.slice(i, j));
      if (!isFinite(v)) throw new Error("bad number");
      toks.push({ t: "num", v });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const w = s.slice(i, j).toLowerCase();
      if (w === "pi") toks.push({ t: "num", v: Math.PI });
      else if (w === "e") toks.push({ t: "num", v: Math.E });
      else if (FUNCS.has(w)) toks.push({ t: "fn", v: w });
      else throw new Error(`unknown: ${w}`);
      i = j;
      continue;
    }
    if (c === "(") { toks.push({ t: "lp" }); i++; continue; }
    if (c === ")") { toks.push({ t: "rp" }); i++; continue; }
    if ("+-*/^%".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`bad char: ${c}`);
  }
  // Tag unary minus/plus.
  const out: Tok[] = [];
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.t === "op" && (tk.v === "-" || tk.v === "+")) {
      const prev = out[out.length - 1];
      const isUnary = !prev || prev.t === "op" || prev.t === "lp" || prev.t === "fn";
      if (isUnary) {
        if (tk.v === "-") out.push({ t: "op", v: "u-" });
        // unary '+' is a no-op
        continue;
      }
    }
    out.push(tk);
  }
  return out;
}

function toRPN(toks: Tok[]): Tok[] {
  const output: Tok[] = [];
  const stack: Tok[] = [];
  for (const tk of toks) {
    if (tk.t === "num") output.push(tk);
    else if (tk.t === "fn") stack.push(tk);
    else if (tk.t === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t === "op" || top.t === "fn") {
          const topPrec = top.t === "fn" ? 6 : PREC[top.v];
          const curPrec = PREC[tk.v];
          if (topPrec > curPrec || (topPrec === curPrec && !RIGHT.has(tk.v))) {
            output.push(stack.pop()!);
            continue;
          }
        }
        break;
      }
      stack.push(tk);
    } else if (tk.t === "lp") stack.push(tk);
    else if (tk.t === "rp") {
      while (stack.length && stack[stack.length - 1].t !== "lp") output.push(stack.pop()!);
      if (!stack.length) throw new Error("mismatched )");
      stack.pop(); // remove lp
      if (stack.length && stack[stack.length - 1].t === "fn") output.push(stack.pop()!);
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.t === "lp") throw new Error("mismatched (");
    output.push(top);
  }
  return output;
}

function applyFn(name: string, x: number, deg: boolean): number {
  const toRad = (d: number) => (deg ? (d * Math.PI) / 180 : d);
  const fromRad = (r: number) => (deg ? (r * 180) / Math.PI : r);
  switch (name) {
    case "sin": return Math.sin(toRad(x));
    case "cos": return Math.cos(toRad(x));
    case "tan": return Math.tan(toRad(x));
    case "asin": return fromRad(Math.asin(x));
    case "acos": return fromRad(Math.acos(x));
    case "atan": return fromRad(Math.atan(x));
    case "ln": return Math.log(x);
    case "log": return Math.log10(x);
    case "sqrt": return Math.sqrt(x);
    case "abs": return Math.abs(x);
    case "exp": return Math.exp(x);
    default: throw new Error(`unknown fn: ${name}`);
  }
}

function evalRPN(rpn: Tok[], deg: boolean): number {
  const st: number[] = [];
  for (const tk of rpn) {
    if (tk.t === "num") st.push(tk.v);
    else if (tk.t === "fn") {
      if (!st.length) throw new Error("missing arg");
      st.push(applyFn(tk.v, st.pop()!, deg));
    } else if (tk.t === "op") {
      if (tk.v === "u-") {
        if (!st.length) throw new Error("syntax");
        st.push(-st.pop()!);
        continue;
      }
      if (st.length < 2) throw new Error("syntax");
      const b = st.pop()!;
      const a = st.pop()!;
      switch (tk.v) {
        case "+": st.push(a + b); break;
        case "-": st.push(a - b); break;
        case "*": st.push(a * b); break;
        case "/": st.push(a / b); break;
        case "^": st.push(Math.pow(a, b)); break;
        case "%": st.push(a % b); break;
        default: throw new Error(`unknown op: ${tk.v}`);
      }
    }
  }
  if (st.length !== 1) throw new Error("syntax");
  return st[0];
}

/** Evaluate an expression string. Throws on malformed input. */
export function evaluate(expr: string, deg: boolean): number {
  const trimmed = expr.trim();
  if (!trimmed) return 0;
  const result = evalRPN(toRPN(tokenize(trimmed)), deg);
  if (!isFinite(result)) throw new Error("not finite");
  return result;
}

/** Format a result for display (trim float noise, cap precision). */
export function formatResult(n: number): string {
  if (!isFinite(n)) return "Error";
  if (Number.isInteger(n)) return String(n);
  // Round to 10 significant digits, strip trailing zeros.
  const r = parseFloat(n.toPrecision(10));
  return String(r);
}
