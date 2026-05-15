import { RULES, type Issue, type RuleContext } from "./rules";

export function checkText(text: string, ctx: RuleContext = { glossary: [] }): Issue[] {
  if (!text) return [];
  const all: Issue[] = [];
  for (const rule of RULES) {
    all.push(...rule.check(text, ctx));
  }
  // Ordena por offset para facilitar a UI.
  return all.sort((a, b) => a.offset - b.offset);
}

export { RULES, type Issue, type RuleContext } from "./rules";
