import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useDebouncedAutosave,
  type AutosaveStatus,
} from "@/hooks/useDebouncedAutosave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useDebouncedAutosave", () => {
  it("fires onSave exactly once after the quiet period despite many schedule calls", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedAutosave<number>({ delayMs: 800, onSave }),
    );

    act(() => {
      result.current.schedule(1);
      result.current.schedule(2);
      result.current.schedule(3);
    });

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(3);
  });

  it("cancel() prevents the pending save from firing", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedAutosave<string>({ delayMs: 800, onSave }),
    );

    act(() => {
      result.current.schedule("draft");
    });
    act(() => {
      result.current.cancel();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("flush() invokes onSave immediately with the latest value and resets the timer", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedAutosave<string>({ delayMs: 800, onSave }),
    );

    act(() => {
      result.current.schedule("v1");
      result.current.schedule("v2");
    });

    await act(async () => {
      await result.current.flush();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("v2");

    // Timer should be drained; advancing further does NOT fire again.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("flush() is a no-op when there is no pending value", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedAutosave<string>({ delayMs: 800, onSave }),
    );

    await act(async () => {
      await result.current.flush();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not fire pending save after unmount", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() =>
      useDebouncedAutosave<number>({ delayMs: 800, onSave }),
    );

    act(() => {
      result.current.schedule(42);
    });
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("status transitions saving → saved on a successful save", async () => {
    const onStatus = vi.fn<(s: AutosaveStatus) => void>();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedAutosave<number>({ delayMs: 800, onSave, onStatus }),
    );

    act(() => {
      result.current.schedule(1);
    });
    expect(onStatus).toHaveBeenCalledWith("saving");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(onStatus).toHaveBeenCalledWith("saved");
    expect(onStatus).not.toHaveBeenCalledWith("error");
  });

  it("status transitions saving → error when onSave throws", async () => {
    const onStatus = vi.fn<(s: AutosaveStatus) => void>();
    const onSave = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() =>
      useDebouncedAutosave<number>({ delayMs: 800, onSave, onStatus }),
    );

    act(() => {
      result.current.schedule(1);
    });
    expect(onStatus).toHaveBeenCalledWith("saving");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(onStatus).toHaveBeenCalledWith("error");
    expect(onStatus).not.toHaveBeenCalledWith("saved");
  });

  it("uses the default 800ms when delayMs is omitted", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedAutosave<number>({ onSave }),
    );

    act(() => {
      result.current.schedule(1);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
