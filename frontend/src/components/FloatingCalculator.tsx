import { Alert, Paper, Popover, Stack, TextField, Typography } from "@mui/material";
import { useState, type RefObject } from "react";

type FloatingCalculatorProps = {
  open: boolean;
  onClose: () => void;
  /** Dock trigger — the popover anchors above it. */
  triggerRef: RefObject<HTMLElement | null>;
};

/**
 * Office-wide floating calculator — a portaled MUI Popover anchored above its dock
 * button (never clipped by the dock's transform/overflow). Material UI.
 */
export function FloatingCalculator({ open, onClose, triggerRef }: FloatingCalculatorProps) {
  const [expr, setExpr] = useState("");
  const result = safeEval(expr);

  return (
    <Popover
      open={open}
      anchorEl={triggerRef.current}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      slotProps={{ paper: { className: "esti-neu", sx: { width: 260, p: 2 } } }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Calculator</Typography>
        <TextField
          id="calc-screen"
          hiddenLabel
          size="small"
          autoFocus
          placeholder="e.g. (1200*2.5)+18%"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && result !== null) setExpr(formatNum(result));
          }}
          fullWidth
        />
        {result === null && expr.trim() ? (
          <Alert severity="error">Invalid expression</Alert>
        ) : (
          <Paper className="esti-neu-inset" sx={{ p: 1.5 }}>
            <Typography variant="h6">
              {expr.trim() === "" ? "0" : `= ${formatNum(result ?? 0)}`}
            </Typography>
          </Paper>
        )}
        <Typography variant="caption" color="text.secondary">
          + − × ÷ ( ) and % (e.g. 5000+18% = 5900). Enter to reuse the result.
        </Typography>
      </Stack>
    </Popover>
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
