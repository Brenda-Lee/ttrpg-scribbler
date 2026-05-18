import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library auto-cleanup is only wired when Vitest provides a
// global `afterEach`. Our `globals: false` config disables that, so unmount
// between tests explicitly to prevent DOM leakage across cases.
afterEach(() => {
  cleanup();
});

// jsdom does not implement the pointer capture API or `scrollIntoView`, which
// Radix UI (Select, Dropdown, Popover) calls during open/keyboard handling.
// Stub them so component tests don't crash with "is not a function".
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

// jsdom doesn't ship a ResizeObserver; Radix's `useSize` uses it on mount.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}
