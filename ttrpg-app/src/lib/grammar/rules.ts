export type Severity = "info" | "warning" | "error";

export type Issue = {
  ruleId: string;
  message: string;
  offset: number;
  length: number;
  suggestion?: string;
  severity: Severity;
};

export type Rule = {
  id: string;
  label: string;
  severity: Severity;
  check: (text: string, ctx: RuleContext) => Issue[];
};

export type GlossaryWord = {
  term: string;
  caseSensitive: boolean;
};

export type RuleContext = {
  glossary: GlossaryWord[];
};

const DOUBLE_SPACE: Rule = {
  id: "double-space",
  label: "Espaço duplo",
  severity: "warning",
  check(text) {
    const issues: Issue[] = [];
    const re = / {2,}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      issues.push({
        ruleId: "double-space",
        message: "Espaço duplo (use apenas um espaço).",
        offset: m.index,
        length: m[0].length,
        suggestion: " ",
        severity: "warning",
      });
    }
    return issues;
  },
};

const SPACE_BEFORE_PUNCT: Rule = {
  id: "space-before-punct",
  label: "Espaço antes de pontuação",
  severity: "warning",
  check(text) {
    const issues: Issue[] = [];
    const re = / +([,.;:!?])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      issues.push({
        ruleId: "space-before-punct",
        message: "Não há espaço antes de pontuação.",
        offset: m.index,
        length: m[0].length,
        suggestion: m[1],
        severity: "warning",
      });
    }
    return issues;
  },
};

const REPEATED_WORD: Rule = {
  id: "repeated-word",
  label: "Palavra repetida",
  severity: "warning",
  check(text) {
    const issues: Issue[] = [];
    const re = /\b([\p{L}]{2,})\s+\1\b/giu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      issues.push({
        ruleId: "repeated-word",
        message: `Palavra repetida: "${m[1]}".`,
        offset: m.index,
        length: m[0].length,
        suggestion: m[1],
        severity: "warning",
      });
    }
    return issues;
  },
};

const CAPITAL_AFTER_PERIOD: Rule = {
  id: "capital-after-period",
  label: "Maiúscula após ponto",
  severity: "info",
  check(text) {
    const issues: Issue[] = [];
    // Pontuação final + espaço(s) + letra minúscula
    const re = /([.!?])\s+(\p{Ll})/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const letterIdx = m.index + m[0].length - 1;
      issues.push({
        ruleId: "capital-after-period",
        message: "Frases iniciam com letra maiúscula.",
        offset: letterIdx,
        length: 1,
        suggestion: m[2].toUpperCase(),
        severity: "info",
      });
    }
    return issues;
  },
};

const LONG_PARAGRAPH: Rule = {
  id: "long-paragraph",
  label: "Parágrafo muito longo",
  severity: "info",
  check(text) {
    const issues: Issue[] = [];
    const paragraphs = text.split(/\n+/);
    let cursor = 0;
    for (const p of paragraphs) {
      const wc = p.trim() ? p.trim().split(/\s+/).length : 0;
      if (wc > 220) {
        issues.push({
          ruleId: "long-paragraph",
          message: `Parágrafo com ${wc} palavras — considere quebrar.`,
          offset: cursor,
          length: p.length,
          severity: "info",
        });
      }
      cursor += p.length + 1; // +1 para o \n
    }
    return issues;
  },
};

const GLOSSARY_CASE: Rule = {
  id: "glossary-case",
  label: "Termo do glossário com caixa diferente",
  severity: "warning",
  check(text, ctx) {
    const issues: Issue[] = [];
    for (const word of ctx.glossary) {
      if (!word.caseSensitive) continue;
      // localiza ocorrências case-insensitive que NÃO batem case-sensitive
      const re = new RegExp(`\\b${escapeRegex(word.term)}\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m[0] !== word.term) {
          issues.push({
            ruleId: "glossary-case",
            message: `O termo "${word.term}" deve ser escrito exatamente assim.`,
            offset: m.index,
            length: m[0].length,
            suggestion: word.term,
            severity: "warning",
          });
        }
      }
    }
    return issues;
  },
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const RULES: Rule[] = [
  DOUBLE_SPACE,
  SPACE_BEFORE_PUNCT,
  REPEATED_WORD,
  CAPITAL_AFTER_PERIOD,
  LONG_PARAGRAPH,
  GLOSSARY_CASE,
];
