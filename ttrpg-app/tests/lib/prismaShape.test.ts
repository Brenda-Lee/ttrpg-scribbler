import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";

describe("Prisma generated types", () => {
  it("CharacterSheetCreateInput accepts the required shape", () => {
    const input = {
      systemSlug: "tormenta20",
      schemaVersion: 1,
      dataJson: JSON.stringify({ for: 14 }),
      character: { connect: { id: "abc" } },
    } satisfies Prisma.CharacterSheetCreateInput;

    expect(input.systemSlug).toBe("tormenta20");
    expect(input.schemaVersion).toBe(1);
  });

  it("CharacterSheetUncheckedCreateInput accepts characterId directly", () => {
    const input = {
      characterId: "abc",
      systemSlug: "generic",
      dataJson: "{}",
    } satisfies Prisma.CharacterSheetUncheckedCreateInput;

    expect(input.characterId).toBe("abc");
  });

  it("CharacterConditionUpdateInput accepts modifiersJson as a string", () => {
    const input: Prisma.CharacterConditionUpdateInput = {
      modifiersJson: JSON.stringify([{ field: "deslocamento", delta: -3 }]),
    };

    expect(input.modifiersJson).toBeDefined();
  });

  it("CharacterConditionUpdateInput accepts modifiersJson: null to clear", () => {
    const input: Prisma.CharacterConditionUpdateInput = {
      modifiersJson: null,
    };

    expect(input.modifiersJson).toBeNull();
  });
});
