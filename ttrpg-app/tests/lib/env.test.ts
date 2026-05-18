import { describe, expect, it } from "vitest";

describe("node environment", () => {
  it("does not expose a document for lib/api tests", () => {
    expect(typeof document).toBe("undefined");
  });
});
