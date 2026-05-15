import { describe, it, expect } from "vitest";
import { slugify, initials, wordCountOf, cn } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases and replaces non-alphanumeric with hyphens", () => {
    expect(slugify("Espelho de Anethel")).toBe("espelho-de-anethel");
    expect(slugify("Valoran")).toBe("valoran");
  });

  it("removes accents (NFD normalization)", () => {
    expect(slugify("política")).toBe("politica");
    expect(slugify("Sépia")).toBe("sepia");
    expect(slugify("Cripta do Véu")).toBe("cripta-do-veu");
  });

  it("collapses sequences of non-alphanumeric into single hyphen", () => {
    expect(slugify("!!foo   bar??")).toBe("foo-bar");
    expect(slugify("a___b")).toBe("a-b");
  });

  it("trims hyphens from start and end", () => {
    expect(slugify("---foo---")).toBe("foo");
    expect(slugify("-a-b-")).toBe("a-b");
  });

  it("returns empty string for empty input or all-special input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
  });

  it("truncates to 64 characters", () => {
    const long = "a".repeat(200);
    expect(slugify(long)).toHaveLength(64);
  });

  it("handles apostrophes and mixed special chars", () => {
    expect(slugify("Sa'Elis")).toBe("sa-elis");
    expect(slugify("Jorek Punho-de-Ferro")).toBe("jorek-punho-de-ferro");
  });
});

describe("initials", () => {
  it("returns first letter of single word", () => {
    expect(initials("Saelis")).toBe("S");
  });

  it("returns first letters of up to max words (default 2)", () => {
    expect(initials("Jorek Punho de Ferro")).toBe("JP");
  });

  it("respects custom max", () => {
    expect(initials("Jorek Punho de Ferro", 3)).toBe("JPD");
    expect(initials("Jorek Punho de Ferro", 4)).toBe("JPDF");
  });

  it("returns empty string for empty input", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });

  it("ignores extra whitespace", () => {
    expect(initials("  foo   bar  ")).toBe("FB");
  });

  it("uppercases letters", () => {
    expect(initials("lower case")).toBe("LC");
  });
});

describe("wordCountOf", () => {
  it("returns 0 for empty string", () => {
    expect(wordCountOf("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(wordCountOf("   \n\t  ")).toBe(0);
  });

  it("returns 1 for single word", () => {
    expect(wordCountOf("hello")).toBe(1);
    expect(wordCountOf("  hello  ")).toBe(1);
  });

  it("counts multiple words separated by varied whitespace", () => {
    expect(wordCountOf("foo bar baz")).toBe(3);
    expect(wordCountOf("  foo\tbar\nbaz  ")).toBe(3);
  });

  it("counts hyphenated words as one", () => {
    expect(wordCountOf("punho-de-ferro")).toBe(1);
  });
});

describe("cn", () => {
  it("merges class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("resolves tailwind conflicts via tailwind-merge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-lg")).toBe("text-lg");
  });

  it("handles falsy values from clsx", () => {
    expect(cn("base", false && "x", undefined, null, "y")).toBe("base y");
  });

  it("handles array and object class values", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });
});
