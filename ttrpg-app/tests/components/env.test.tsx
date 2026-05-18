import { describe, expect, it } from "vitest";

describe("jsdom environment", () => {
  it("exposes a document for component tests", () => {
    expect(typeof document).toBe("object");
    expect(document.createElement("div")).toBeInstanceOf(HTMLDivElement);
  });

  it("registers @testing-library/jest-dom matchers", () => {
    const el = document.createElement("span");
    el.textContent = "ok";
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("ok");
    document.body.removeChild(el);
  });
});
