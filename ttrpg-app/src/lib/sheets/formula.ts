export type FormulaNode =
  | { kind: "num"; value: number }
  | { kind: "ref"; name: string }
  | { kind: "bin"; op: "+" | "-" | "*" | "/"; left: FormulaNode; right: FormulaNode }
  | { kind: "call"; fn: "floor" | "min" | "max" | "mod"; args: FormulaNode[] };

const KNOWN_FUNCTIONS = ["floor", "min", "max", "mod"] as const;
type FnName = (typeof KNOWN_FUNCTIONS)[number];

function isKnownFn(name: string): name is FnName {
  return (KNOWN_FUNCTIONS as readonly string[]).includes(name);
}

type Token =
  | { kind: "num"; value: number; pos: number }
  | { kind: "ident"; value: string; pos: number }
  | { kind: "op"; value: "+" | "-" | "*" | "/"; pos: number }
  | { kind: "lparen"; pos: number }
  | { kind: "rparen"; pos: number }
  | { kind: "comma"; pos: number }
  | { kind: "eof"; pos: number };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const text = src.slice(i, j);
      const value = Number(text);
      if (!Number.isFinite(value)) {
        throw new Error(`parse error at ${i}: invalid number '${text}'`);
      }
      tokens.push({ kind: "num", value, pos: i });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ kind: "ident", value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ kind: "op", value: c, pos: i });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen", pos: i });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen", pos: i });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ kind: "comma", pos: i });
      i++;
      continue;
    }
    throw new Error(`parse error at ${i}: unexpected character '${c}'`);
  }
  tokens.push({ kind: "eof", pos: src.length });
  return tokens;
}

class Parser {
  pos = 0;
  constructor(private tokens: Token[]) {}

  peek(): Token {
    return this.tokens[this.pos];
  }

  consume(): Token {
    return this.tokens[this.pos++];
  }

  parseExpression(): FormulaNode {
    let left = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t.kind !== "op" || (t.value !== "+" && t.value !== "-")) break;
      this.consume();
      const right = this.parseTerm();
      left = { kind: "bin", op: t.value, left, right };
    }
    return left;
  }

  parseTerm(): FormulaNode {
    let left = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (t.kind !== "op" || (t.value !== "*" && t.value !== "/")) break;
      this.consume();
      const right = this.parseFactor();
      left = { kind: "bin", op: t.value, left, right };
    }
    return left;
  }

  parseFactor(): FormulaNode {
    const t = this.peek();
    if (t.kind === "op" && t.value === "-") {
      this.consume();
      return {
        kind: "bin",
        op: "-",
        left: { kind: "num", value: 0 },
        right: this.parseFactor(),
      };
    }
    if (t.kind === "num") {
      this.consume();
      return { kind: "num", value: t.value };
    }
    if (t.kind === "lparen") {
      this.consume();
      const inner = this.parseExpression();
      const close = this.peek();
      if (close.kind !== "rparen") {
        throw new Error(
          `parse error at ${close.pos}: expected ')' (unclosed parenthesis)`,
        );
      }
      this.consume();
      return inner;
    }
    if (t.kind === "ident") {
      this.consume();
      if (this.peek().kind === "lparen") {
        if (!isKnownFn(t.value)) {
          throw new Error(
            `parse error at ${t.pos}: unknown function '${t.value}'`,
          );
        }
        this.consume();
        const args: FormulaNode[] = [];
        if (this.peek().kind !== "rparen") {
          args.push(this.parseExpression());
          while (this.peek().kind === "comma") {
            this.consume();
            args.push(this.parseExpression());
          }
        }
        const close = this.peek();
        if (close.kind !== "rparen") {
          throw new Error(
            `parse error at ${close.pos}: expected ')' or ',' in '${t.value}' call`,
          );
        }
        this.consume();
        if ((t.value === "floor" || t.value === "mod") && args.length !== 1) {
          throw new Error(
            `parse error at ${t.pos}: '${t.value}' takes 1 argument, got ${args.length}`,
          );
        }
        if ((t.value === "min" || t.value === "max") && args.length < 2) {
          throw new Error(
            `parse error at ${t.pos}: '${t.value}' takes 2 or more arguments, got ${args.length}`,
          );
        }
        return { kind: "call", fn: t.value, args };
      }
      return { kind: "ref", name: t.value };
    }
    throw new Error(`parse error at ${t.pos}: unexpected token '${t.kind}'`);
  }
}

export function parse(expr: string): FormulaNode {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  const root = parser.parseExpression();
  const trailing = parser.peek();
  if (trailing.kind !== "eof") {
    throw new Error(
      `parse error at ${trailing.pos}: unexpected token '${trailing.kind}' after expression`,
    );
  }
  return root;
}

export function evaluate(node: FormulaNode, scope: Record<string, number>): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "ref":
      return scope[node.name] ?? NaN;
    case "bin": {
      const l = evaluate(node.left, scope);
      const r = evaluate(node.right, scope);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return r === 0 ? NaN : l / r;
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "call": {
      const args = node.args.map((a) => evaluate(a, scope));
      switch (node.fn) {
        case "floor":
          return Math.floor(args[0]);
        case "min":
          return Math.min(...args);
        case "max":
          return Math.max(...args);
        case "mod":
          return Math.floor((args[0] - 10) / 2);
      }
    }
  }
}
