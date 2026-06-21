"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { X, Calculator as CalcIcon, GripHorizontal } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { evaluate, formatResult } from "@/lib/exam/calc";

interface Props {
  onClose: () => void;
}

/**
 * In-exam scientific calculator (Accounting + Ops Mgmt). Compact floating
 * panel, draggable by its header (1-click open from the toolbar). Uses the safe
 * evaluator in lib/exam/calc.ts — no eval.
 */
export function ExamCalculator({ onClose }: Props) {
  const { t } = useTranslation();
  const [expr, setExpr] = useState("");
  const [deg, setDeg] = useState(true);
  const justEvaluated = useRef(false);
  const dragControls = useDragControls();
  const boundsRef = useRef<HTMLDivElement>(null);

  const preview = useMemo(() => {
    if (!expr.trim()) return "0";
    try {
      return formatResult(evaluate(expr, deg));
    } catch {
      return null; // incomplete / invalid → no preview yet
    }
  }, [expr, deg]);

  // Insert a token, handling chaining after "=".
  const input = (token: string, kind: "num" | "op" | "fn" | "const") => {
    setExpr((prev) => {
      if (justEvaluated.current) {
        justEvaluated.current = false;
        // After '=': start fresh on a value, continue from result on an operator.
        if (kind === "op") return prev + token;
        return token;
      }
      return prev + token;
    });
  };

  const clearAll = () => {
    justEvaluated.current = false;
    setExpr("");
  };

  const backspace = () => {
    justEvaluated.current = false;
    setExpr((p) => p.slice(0, -1));
  };

  const negate = () => {
    setExpr((p) => {
      if (!p) return p;
      return p.startsWith("-(") && p.endsWith(")") ? p.slice(2, -1) : `-(${p})`;
    });
  };

  const equals = () => {
    if (preview === null) return;
    setExpr(preview);
    justEvaluated.current = true;
  };

  return (
    <div ref={boundsRef} className="pointer-events-none fixed inset-0 z-[115]">
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={boundsRef}
        dragElastic={0}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="pointer-events-auto absolute bottom-24 right-4 w-[18rem] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header (drag handle) */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex cursor-move touch-none items-center justify-between border-b border-border bg-muted/40 px-3 py-2"
        >
          <div className="flex items-center gap-1.5">
            <CalcIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {t("exam.calculator_title")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <GripHorizontal className="h-4 w-4 text-muted-foreground/50" />
            <button
              type="button"
              onClick={onClose}
              aria-label={t("exam.scratchpad_close")}
              className="hs-press flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Display */}
        <div className="bg-background px-3 py-2.5 text-right">
          <div className="min-h-4 truncate text-xs text-muted-foreground" dir="ltr">
            {expr || " "}
          </div>
          <div className="truncate text-2xl font-bold tabular-nums text-foreground" dir="ltr">
            {preview ?? "…"}
          </div>
        </div>

        {/* Function bar */}
        <div className="grid grid-cols-4 gap-1 border-t border-border bg-muted/20 p-1.5">
          <CalcBtn label={deg ? "DEG" : "RAD"} onClick={() => setDeg((d) => !d)} variant="accent" />
          <CalcBtn label="sin" onClick={() => input("sin(", "fn")} variant="fn" />
          <CalcBtn label="cos" onClick={() => input("cos(", "fn")} variant="fn" />
          <CalcBtn label="tan" onClick={() => input("tan(", "fn")} variant="fn" />
          <CalcBtn label="ln" onClick={() => input("ln(", "fn")} variant="fn" />
          <CalcBtn label="log" onClick={() => input("log(", "fn")} variant="fn" />
          <CalcBtn label="√" onClick={() => input("√(", "fn")} variant="fn" />
          <CalcBtn label="x²" onClick={() => input("^2", "op")} variant="fn" />
          <CalcBtn label="xʸ" onClick={() => input("^", "op")} variant="fn" />
          <CalcBtn label="π" onClick={() => input("π", "const")} variant="fn" />
          <CalcBtn label="e" onClick={() => input("e", "const")} variant="fn" />
          <CalcBtn label="±" onClick={negate} variant="fn" />
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-1 p-1.5 pt-0">
          <CalcBtn label="C" onClick={clearAll} variant="warn" />
          <CalcBtn label="(" onClick={() => input("(", "num")} variant="op" />
          <CalcBtn label=")" onClick={() => input(")", "op")} variant="op" />
          <CalcBtn label="⌫" onClick={backspace} variant="op" />

          <CalcBtn label="7" onClick={() => input("7", "num")} />
          <CalcBtn label="8" onClick={() => input("8", "num")} />
          <CalcBtn label="9" onClick={() => input("9", "num")} />
          <CalcBtn label="÷" onClick={() => input("÷", "op")} variant="op" />

          <CalcBtn label="4" onClick={() => input("4", "num")} />
          <CalcBtn label="5" onClick={() => input("5", "num")} />
          <CalcBtn label="6" onClick={() => input("6", "num")} />
          <CalcBtn label="×" onClick={() => input("×", "op")} variant="op" />

          <CalcBtn label="1" onClick={() => input("1", "num")} />
          <CalcBtn label="2" onClick={() => input("2", "num")} />
          <CalcBtn label="3" onClick={() => input("3", "num")} />
          <CalcBtn label="−" onClick={() => input("-", "op")} variant="op" />

          <CalcBtn label="0" onClick={() => input("0", "num")} />
          <CalcBtn label="." onClick={() => input(".", "num")} />
          <CalcBtn label="+" onClick={() => input("+", "op")} variant="op" />
          <CalcBtn label="=" onClick={equals} variant="primary" />
        </div>
      </motion.div>
    </div>
  );
}

function CalcBtn({
  label,
  onClick,
  variant = "num",
}: {
  label: string;
  onClick: () => void;
  variant?: "num" | "op" | "fn" | "primary" | "warn" | "accent";
}) {
  const styles: Record<string, string> = {
    num: "bg-card text-foreground hover:bg-muted",
    op: "bg-muted/60 text-primary hover:bg-muted font-semibold",
    fn: "bg-card text-muted-foreground hover:bg-muted text-[11px]",
    primary: "bg-primary text-primary-foreground hover:opacity-90 font-bold",
    warn: "bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold dark:text-red-400",
    accent: "bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-bold",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hs-press flex h-10 items-center justify-center rounded-lg border border-border text-sm tabular-nums transition-colors ${styles[variant]}`}
    >
      {label}
    </button>
  );
}
