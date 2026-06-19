import { InlineNotification, Stack, TextInput, Tile } from "@carbon/react";
import { useRef, useState, type RefObject } from "react";
import { useDismissOnOutsideClick } from "../lib/useDismissOnOutsideClick.js";
import { ScrollAffordance } from "./ScrollAffordance.js";

type FloatingCalculatorProps = {
  open: boolean;
  onClose: () => void;
  /** Dock trigger — excluded from outside-dismiss. */
  triggerRef: RefObject<HTMLElement | null>;
};

/**
 * Office-wide floating calculator — anchored beside the dock (no modal backdrop).
 * Closes on pointer-down outside the panel and its trigger.
 */
export function FloatingCalculator({ open, onClose, triggerRef }: FloatingCalculatorProps) {
  const [expr, setExpr] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const result = safeEval(expr);

  useDismissOnOutsideClick(open, onClose, [panelRef, triggerRef]);

  if (!open) return null;

  return (
    <div ref={panelRef} className="esti-float-widget esti-float-calc">
      <Tile className="esti-float-panel-shell">
        <ScrollAffordance>
          <Stack gap={4}>
          <h4>Calculator</h4>
          <TextInput
            id="calc-screen"
            labelText="Calculator"
            hideLabel
            size="lg"
            autoFocus
            placeholder="e.g. (1200*2.5)+18%"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && result !== null)
                setExpr(formatNum(result));
            }}
          />
          {result === null && expr.trim() ? (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Invalid expression"
            />
          ) : (
            <Tile>
              <h3>
                {expr.trim() === "" ? "0" : `= ${formatNum(result ?? 0)}`}
              </h3>
            </Tile>
          )}
          <p>
            + − × ÷ ( ) and % (e.g. 5000+18% = 5900). Enter to reuse the result.
          </p>
          </Stack>
        </ScrollAffordance>
      </Tile>
    </div>
  );
}

/**
 * Safe arithmetic evaluator (no eval): tokenise → shunting-yard → RPN.
 * Supports + - * / ( ) and trailing "n%" (percent of the running expression).
 */
function safeEval(input: string): number | null {
  const expr = input.trim();
  if (!expr) return null;
  const s = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const tokens = s.match(/(\d+\.?\d*|\.\d+|[+\-*/()%])/g);
  if (!tokens || tokens.join("") !== s.replace(/\s+/g, "")) return null;

  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const out: (number | string)[] = [];
  const ops: string[] = [];
  for (const t of tokens) {
    if (/^[\d.]/.test(t)) {
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      out.push(n);
    } else if (t === "%") {
      out.push("%");
    } else if (t === "(") {
      ops.push(t);
    } else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()!);
      if (!ops.length) return null;
      ops.pop();
    } else {
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        (prec[ops[ops.length - 1]!] ?? 0) >= prec[t]!
      )
        out.push(ops.pop()!);
      ops.push(t);
    }
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return null;
    out.push(op);
  }

  const st: number[] = [];
  for (const t of out) {
    if (typeof t === "number") {
      st.push(t);
    } else if (t === "%") {
      const a = st.pop();
      if (a === undefined) return null;
      st.push(a / 100);
    } else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) return null;
      st.push(
        t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : a / b,
      );
    }
  }
  const r = st.pop();
  return st.length === 0 && r !== undefined && Number.isFinite(r) ? r : null;
}

function formatNum(n: number): string {
  return String(Math.round(n * 1e8) / 1e8);
}
