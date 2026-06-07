import { Button } from "@carbon/react";
import { useState } from "react";

type Op = "+" | "−" | "×" | "÷";
const APPLY: Record<Op, (a: number, b: number) => number> = {
  "+": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => (b === 0 ? NaN : a / b),
};

/** Office-wide floating calculator, toggled from the bottom-left of the screen. */
export function FloatingCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true); // next digit starts a new number

  function inputDigit(d: string) {
    setDisplay((cur) => (fresh || cur === "0" ? d : cur + d));
    setFresh(false);
  }
  function inputDot() {
    if (fresh) {
      setDisplay("0.");
      setFresh(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }
  function clearAll() {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
  }
  function backspace() {
    setDisplay((cur) => (cur.length <= 1 ? "0" : cur.slice(0, -1)));
  }
  function percent() {
    setDisplay((cur) => String(Number(cur) / 100));
  }
  function chooseOp(next: Op) {
    const val = Number(display);
    if (acc !== null && op && !fresh) {
      const r = APPLY[op](acc, val);
      setAcc(r);
      setDisplay(formatNum(r));
    } else {
      setAcc(val);
    }
    setOp(next);
    setFresh(true);
  }
  function equals() {
    if (op === null || acc === null) return;
    const r = APPLY[op](acc, Number(display));
    setDisplay(formatNum(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  }

  const keys: { label: string; onClick: () => void; kind?: "op" | "fn" }[] = [
    { label: "C", onClick: clearAll, kind: "fn" },
    { label: "←", onClick: backspace, kind: "fn" },
    { label: "%", onClick: percent, kind: "fn" },
    { label: "÷", onClick: () => chooseOp("÷"), kind: "op" },
    { label: "7", onClick: () => inputDigit("7") },
    { label: "8", onClick: () => inputDigit("8") },
    { label: "9", onClick: () => inputDigit("9") },
    { label: "×", onClick: () => chooseOp("×"), kind: "op" },
    { label: "4", onClick: () => inputDigit("4") },
    { label: "5", onClick: () => inputDigit("5") },
    { label: "6", onClick: () => inputDigit("6") },
    { label: "−", onClick: () => chooseOp("−"), kind: "op" },
    { label: "1", onClick: () => inputDigit("1") },
    { label: "2", onClick: () => inputDigit("2") },
    { label: "3", onClick: () => inputDigit("3") },
    { label: "+", onClick: () => chooseOp("+"), kind: "op" },
    { label: "0", onClick: () => inputDigit("0") },
    { label: ".", onClick: inputDot },
    { label: "=", onClick: equals, kind: "op" },
  ];

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen((o) => !o)}
        style={{ position: "fixed", left: 16, bottom: 16, zIndex: 8000, borderRadius: 4 }}
      >
        {open ? "Close calc" : "🧮 Calc"}
      </Button>

      {open && (
        <div
          style={{
            position: "fixed",
            left: 16,
            bottom: 56,
            zIndex: 8000,
            width: 232,
            background: "#161616",
            color: "#fff",
            padding: 8,
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              background: "#262626",
              padding: "10px 12px",
              textAlign: "right",
              fontSize: 22,
              fontVariantNumeric: "tabular-nums",
              overflow: "hidden",
              marginBottom: 6,
            }}
          >
            {display}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {keys.map((k) => (
              <button
                key={k.label}
                onClick={k.onClick}
                style={{
                  padding: "10px 0",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 15,
                  color: "#fff",
                  background:
                    k.kind === "op" ? "#0f62fe" : k.kind === "fn" ? "#525252" : "#393939",
                  gridColumn: k.label === "0" ? "span 2" : undefined,
                }}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  return String(Math.round(n * 1e8) / 1e8);
}
