/**
 * Convert LaTeX math expressions to natural language for TTS.
 *
 * Processing order matters - complex patterns must be replaced
 * before simpler ones to avoid partial matches.
 *
 * At runtime, LaTeX in rangkuman strings has single backslashes
 * (source: `\\mu` → runtime: `\mu`).
 */

export function latexToSpeech(
  latex: string,
  lang: "id" | "en" = "id"
): string {
  let t = latex.trim();

  // ── 1. Extract \text{...} ──
  t = t.replace(/\\text\s*\{([^}]*)\}/g, " $1 ");

  // ── 2. Fractions: \frac{num}{den} ──
  // Handles nested braces one level deep
  t = t.replace(
    /\\frac\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    (_, num, den) => {
      const n = latexToSpeech(num, lang);
      const d = latexToSpeech(den, lang);
      return lang === "id" ? `${n} per ${d}` : `${n} over ${d}`;
    }
  );

  // ── 3. nth roots: \sqrt[n]{x} ──
  t = t.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^}]*)\}/g, (_, n, x) => {
    const nT = latexToSpeech(n, lang);
    const xT = latexToSpeech(x, lang);
    return lang === "id"
      ? `akar pangkat ${nT} dari ${xT}`
      : `${nT}th root of ${xT}`;
  });

  // ── 4. Square roots: \sqrt{x} ──
  t = t.replace(/\\sqrt\s*\{([^}]*)\}/g, (_, x) => {
    const xT = latexToSpeech(x, lang);
    return lang === "id" ? `akar dari ${xT}` : `square root of ${xT}`;
  });

  // ── 5. Overbar: \bar{x} ──
  t = t.replace(/\\bar\s*\{([^}]*)\}/g, "$1 bar");

  // ── 6. Superscripts (braces): x^{exp} ──
  t = t.replace(/\^\{([^}]*)\}/g, (_, exp) => {
    if (exp === "2") return lang === "id" ? " kuadrat" : " squared";
    if (exp === "3") return lang === "id" ? " pangkat tiga" : " cubed";
    const eT = latexToSpeech(exp, lang);
    return lang === "id" ? ` pangkat ${eT}` : ` to the power of ${eT}`;
  });

  // ── 7. Superscripts (no braces): x^2 ──
  t = t.replace(/\^(\w)/g, (_, exp) => {
    if (exp === "2") return lang === "id" ? " kuadrat" : " squared";
    if (exp === "3") return lang === "id" ? " pangkat tiga" : " cubed";
    return lang === "id" ? ` pangkat ${exp}` : ` to the power of ${exp}`;
  });

  // ── 8. Subscripts ──
  t = t.replace(/\_{([^}]*)}/g, " sub $1");
  t = t.replace(/_([a-zA-Z0-9])/g, " sub $1");

  // ── 9. Greek letters ──
  const greekId: [RegExp, string][] = [
    [/\\Sigma/g, "sigma besar"],
    [/\\sigma/g, "sigma"],
    [/\\mu/g, "mu"],
    [/\\alpha/g, "alpha"],
    [/\\beta/g, "beta"],
    [/\\gamma/g, "gamma"],
    [/\\delta/g, "delta"],
    [/\\Delta/g, "delta besar"],
    [/\\pi/g, "pi"],
    [/\\theta/g, "theta"],
    [/\\lambda/g, "lambda"],
    [/\\epsilon/g, "epsilon"],
    [/\\rho/g, "rho"],
    [/\\chi/g, "chi"],
    [/\\omega/g, "omega"],
    [/\\infty/g, "tak hingga"],
    [/\\sim/g, "komplemen"],
  ];
  const greekEn: [RegExp, string][] = [
    [/\\Sigma/g, "summation"],
    [/\\sigma/g, "sigma"],
    [/\\mu/g, "mu"],
    [/\\alpha/g, "alpha"],
    [/\\beta/g, "beta"],
    [/\\gamma/g, "gamma"],
    [/\\delta/g, "delta"],
    [/\\Delta/g, "capital delta"],
    [/\\pi/g, "pi"],
    [/\\theta/g, "theta"],
    [/\\lambda/g, "lambda"],
    [/\\epsilon/g, "epsilon"],
    [/\\rho/g, "rho"],
    [/\\chi/g, "chi"],
    [/\\omega/g, "omega"],
    [/\\infty/g, "infinity"],
    [/\\sim/g, "complement"],
  ];
  for (const [re, repl] of lang === "id" ? greekId : greekEn) {
    t = t.replace(re, ` ${repl} `);
  }

  // ── 10. Operators ──
  t = t.replace(/\\cdot/g, lang === "id" ? " kali " : " times ");
  t = t.replace(/\\times/g, lang === "id" ? " kali " : " times ");
  t = t.replace(/\\div/g, lang === "id" ? " dibagi " : " divided by ");
  t = t.replace(
    /\\geq?/g,
    lang === "id" ? " lebih besar atau sama dengan " : " greater than or equal to "
  );
  t = t.replace(
    /\\leq?/g,
    lang === "id" ? " lebih kecil atau sama dengan " : " less than or equal to "
  );
  t = t.replace(
    /\\neq?/g,
    lang === "id" ? " tidak sama dengan " : " not equal to "
  );
  t = t.replace(/\\pm/g, " plus minus ");
  t = t.replace(
    /\\approx/g,
    lang === "id" ? " kurang lebih " : " approximately "
  );
  t = t.replace(/\\ldots|\\dots|\.\.\./g, " dan seterusnya ");
  t = t.replace(/\\left|\\right/g, "");
  t = t.replace(/\\,/g, " ");

  // ── 11. Factorial ──
  t = t.replace(/(\w)!/g, "$1 faktorial ");

  // ── 12. Remove remaining LaTeX commands ──
  t = t.replace(/\\[a-zA-Z]+/g, "");

  // ── 13. Remove braces ──
  t = t.replace(/[{}]/g, "");

  // ── 14. Replace math symbols ──
  // Only replace = > < when surrounded by spaces or at boundaries (not in words)
  t = t.replace(/\s*=\s*/g, lang === "id" ? " sama dengan " : " equals ");
  t = t.replace(/\s*>\s*/g, lang === "id" ? " lebih besar dari " : " greater than ");
  t = t.replace(/\s*<\s*/g, lang === "id" ? " lebih kecil dari " : " less than ");
  // Don't replace + and - globally - they're too common in regular text
  // Only replace when clearly mathematical (surrounded by spaces)
  t = t.replace(/\s\+\s/g, " plus ");
  t = t.replace(/\s-\s/g, " minus ");

  // ── 15. Parentheses ──
  t = t.replace(/\(/g, " ");
  t = t.replace(/\)/g, " ");

  // ── 16. Cleanup ──
  t = t.replace(/\s+/g, " ").trim();

  return t;
}
