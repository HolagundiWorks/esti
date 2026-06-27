/**
 * Safe arithmetic expression engine for the RuleSet-driven Estimation OS.
 *
 * Construction RuleSets author quantity / BOQ-split / material-split / dependency
 * formulas as free-form expressions over named measurement inputs, e.g.
 * `(nos * length * height * thickness) / 1000000000` or `wall_area * 2`. This
 * module evaluates them **without `eval` / `Function`** — a hand-written
 * recursive-descent parser over a fixed grammar, so the only things an
 * expression can reference are the supplied variables and a small whitelist of
 * math functions. Everything is deterministic; results round to 4 dp (matching
 * the legacy `evalFormula`).
 *
 * Grammar:
 *   expr    := term (('+' | '-') term)*
 *   term    := factor (('*' | '/' | '%') factor)*
 *   factor  := ('+' | '-') factor | power
 *   power   := primary ('^' factor)?
 *   primary := number | ident | ident '(' args? ')' | '(' expr ')'
 *   args    := expr (',' expr)*
 */

const FUNCTIONS: Record<string, (...n: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  round: Math.round,
  ceil: Math.ceil,
  floor: Math.floor,
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: Math.pow,
};

// --- AST ---------------------------------------------------------------------

type Node =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "unary"; op: "+" | "-"; arg: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "%" | "^"; l: Node; r: Node }
  | { t: "call"; name: string; args: Node[] };

// --- Tokenizer ---------------------------------------------------------------

type Token =
  | { k: "num"; v: number }
  | { k: "ident"; v: string }
  | { k: "op"; v: string }
  | { k: "paren"; v: "(" | ")" }
  | { k: "comma" };

const OPS = new Set(["+", "-", "*", "/", "%", "^"]);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
  const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c);

  while (i < src.length) {
    const c = src[i]!;
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (isDigit(c) || (c === "." && isDigit(src[i + 1] ?? ""))) {
      let j = i;
      let seenDot = false;
      while (j < src.length && (isDigit(src[j]!) || (src[j] === "." && !seenDot))) {
        if (src[j] === ".") seenDot = true;
        j++;
      }
      const text = src.slice(i, j);
      const v = Number(text);
      if (!Number.isFinite(v)) throw new Error(`Invalid number '${text}'`);
      tokens.push({ k: "num", v });
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i;
      while (j < src.length && isIdentPart(src[j]!)) j++;
      tokens.push({ k: "ident", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "(" || c === ")") {
      tokens.push({ k: "paren", v: c });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ k: "comma" });
      i++;
      continue;
    }
    if (OPS.has(c)) {
      tokens.push({ k: "op", v: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${c}' at position ${i}`);
  }
  return tokens;
}

// --- Parser ------------------------------------------------------------------

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseExpr();
    if (this.pos !== this.tokens.length) throw new Error("Unexpected trailing input in expression");
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("Unexpected end of expression");
    this.pos++;
    return t;
  }

  private parseExpr(): Node {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t?.k === "op" && (t.v === "+" || t.v === "-")) {
        this.pos++;
        left = { t: "bin", op: t.v, l: left, r: this.parseTerm() };
      } else break;
    }
    return left;
  }

  private parseTerm(): Node {
    let left = this.parseFactor();
    for (;;) {
      const t = this.peek();
      if (t?.k === "op" && (t.v === "*" || t.v === "/" || t.v === "%")) {
        this.pos++;
        left = { t: "bin", op: t.v, l: left, r: this.parseFactor() };
      } else break;
    }
    return left;
  }

  private parseFactor(): Node {
    const t = this.peek();
    if (t?.k === "op" && (t.v === "+" || t.v === "-")) {
      this.pos++;
      return { t: "unary", op: t.v, arg: this.parseFactor() };
    }
    return this.parsePower();
  }

  private parsePower(): Node {
    const base = this.parsePrimary();
    const t = this.peek();
    if (t?.k === "op" && t.v === "^") {
      this.pos++;
      // right-associative
      return { t: "bin", op: "^", l: base, r: this.parseFactor() };
    }
    return base;
  }

  private parsePrimary(): Node {
    const t = this.next();
    if (t.k === "num") return { t: "num", v: t.v };
    if (t.k === "paren" && t.v === "(") {
      const inner = this.parseExpr();
      const close = this.next();
      if (close.k !== "paren" || close.v !== ")") throw new Error("Expected ')'");
      return inner;
    }
    if (t.k === "ident") {
      const after = this.peek();
      if (after?.k === "paren" && after.v === "(") {
        this.pos++;
        const args: Node[] = [];
        if (!(this.peek()?.k === "paren" && (this.peek() as { v: string }).v === ")")) {
          args.push(this.parseExpr());
          while (this.peek()?.k === "comma") {
            this.pos++;
            args.push(this.parseExpr());
          }
        }
        const close = this.next();
        if (close.k !== "paren" || close.v !== ")") throw new Error("Expected ')' after arguments");
        return { t: "call", name: t.v, args };
      }
      return { t: "var", name: t.v };
    }
    throw new Error("Unexpected token in expression");
  }
}

/** Parse an expression to an AST. Throws on a syntax error. */
export function parseExpression(expr: string): Node {
  return new Parser(tokenize(expr)).parse();
}

// --- Evaluation --------------------------------------------------------------

function evalNode(node: Node, vars: Record<string, number>): number {
  switch (node.t) {
    case "num":
      return node.v;
    case "var": {
      const v = vars[node.name];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new Error(`Variable '${node.name}' is missing or not a finite number`);
      }
      return v;
    }
    case "unary": {
      const a = evalNode(node.arg, vars);
      return node.op === "-" ? -a : a;
    }
    case "bin": {
      const l = evalNode(node.l, vars);
      const r = evalNode(node.r, vars);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          if (r === 0) throw new Error("Division by zero");
          return l / r;
        case "%":
          if (r === 0) throw new Error("Modulo by zero");
          return l % r;
        case "^":
          return l ** r;
      }
      throw new Error("Unknown operator in expression");
    }
    case "call": {
      const fn = FUNCTIONS[node.name];
      if (!fn) throw new Error(`Unknown function '${node.name}'`);
      return fn(...node.args.map((a) => evalNode(a, vars)));
    }
  }
}

/**
 * Evaluate an expression against named variables. Throws on syntax errors,
 * missing/non-finite variables, unknown functions, division by zero, or a
 * non-finite result. Result is rounded to 4 dp for stable quantities.
 */
export function evaluate(expr: string, vars: Record<string, number> = {}): number {
  const result = evalNode(parseExpression(expr), vars);
  if (!Number.isFinite(result)) throw new Error("Expression did not produce a finite number");
  return Number(result.toFixed(4));
}

/** Collect the distinct variable identifiers an expression references (excludes
 *  function names). Useful for the Builder's input-binding + validation. */
export function extractVariables(expr: string): string[] {
  const out = new Set<string>();
  const walk = (n: Node): void => {
    switch (n.t) {
      case "var":
        out.add(n.name);
        break;
      case "unary":
        walk(n.arg);
        break;
      case "bin":
        walk(n.l);
        walk(n.r);
        break;
      case "call":
        n.args.forEach(walk);
        break;
      default:
        break;
    }
  };
  walk(parseExpression(expr));
  return [...out];
}

export interface ExpressionValidation {
  ok: boolean;
  /** Variables referenced that are not in `allowedVars`. */
  unknownVars: string[];
  /** Syntax / parse error message, if any. */
  error?: string;
}

/**
 * Validate an expression: it must parse, and every variable it references must
 * be in `allowedVars` (the work item's measurement-field keys, plus any
 * dependency-exposed variables). Pure — used for the Builder's live validation.
 */
export function validateExpression(expr: string, allowedVars: string[]): ExpressionValidation {
  const allowed = new Set(allowedVars);
  let vars: string[];
  try {
    vars = extractVariables(expr);
  } catch (e) {
    return { ok: false, unknownVars: [], error: e instanceof Error ? e.message : String(e) };
  }
  const unknownVars = vars.filter((v) => !allowed.has(v));
  return { ok: unknownVars.length === 0, unknownVars };
}
