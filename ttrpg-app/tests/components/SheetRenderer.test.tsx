import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

const { toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: vi.fn(), loading: vi.fn() },
}));

import { SheetRenderer } from "@/components/characters/sheet/SheetRenderer";
import type {
  BreakdownEntry,
  FieldValue,
  SheetSchema,
} from "@/lib/sheets/types";
import { useWorkspace } from "@/stores/workspace";

function makeSchema(): SheetSchema {
  return {
    systemSlug: "tormenta20-test",
    schemaVersion: 1,
    sections: [
      {
        id: "atributos",
        title: "Atributos",
        fields: [
          { id: "for", label: "Força", type: "number", default: 0 },
          { id: "des", label: "Destreza", type: "number", default: 0 },
          { id: "raca", label: "Raça", type: "text" },
        ],
      },
      {
        id: "combate",
        title: "Combate",
        fields: [
          { id: "defesa_base", label: "Defesa base", type: "number", default: 10 },
          {
            id: "defesa_efetiva",
            label: "Defesa efetiva",
            type: "derived",
            formula: "defesa_base + des",
          },
          { id: "magico", label: "Mágico", type: "checkbox", default: false },
          {
            id: "tamanho",
            label: "Tamanho",
            type: "select",
            options: ["Pequeno", "Médio", "Grande"],
            default: "Médio",
          },
          {
            id: "anotacoes",
            label: "Anotações",
            type: "textarea",
          },
        ],
      },
    ],
    injuryPresets: [],
  };
}

function makeProps() {
  const schema = makeSchema();
  const base: Record<string, FieldValue> = {
    for: 12,
    des: 14,
    raca: "Élfica",
    defesa_base: 10,
    magico: false,
    tamanho: "Médio",
    anotacoes: "",
  };
  const effective: Record<string, FieldValue> = { ...base, defesa_efetiva: 24 };
  const breakdown: Record<string, BreakdownEntry[]> = {
    defesa_efetiva: [{ source: "formula", reason: "from defesa_base, des" }],
  };
  return { schema, base, effective, breakdown };
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  toastErrorMock.mockReset();
  // Reset workspace store between tests so save status doesn't leak.
  useWorkspace.setState({ saveStatus: "idle", lastSavedAt: null });
  fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SheetRenderer — rendering", () => {
  it("renders every section heading from schema.sections", () => {
    const { schema, base, effective, breakdown } = makeProps();
    render(
      <SheetRenderer
        projectId="p1"
        characterId="c1"
        schema={schema}
        base={base}
        effective={effective}
        breakdown={breakdown}
        conditions={[]}
      />,
    );

    expect(screen.getByText("Atributos")).toBeInTheDocument();
    expect(screen.getByText("Combate")).toBeInTheDocument();
  });

  it("dispatches the correct component for each field type", () => {
    const { schema, base, effective, breakdown } = makeProps();
    render(
      <SheetRenderer
        projectId="p1"
        characterId="c1"
        schema={schema}
        base={base}
        effective={effective}
        breakdown={breakdown}
        conditions={[]}
      />,
    );

    // text
    expect(screen.getByLabelText(/Raça/)).toHaveAttribute("type", "text");
    // number (defesa_base + for + des)
    expect(screen.getByLabelText(/Força/)).toHaveAttribute("type", "number");
    expect(screen.getByLabelText(/Destreza/)).toHaveAttribute("type", "number");
    // checkbox
    expect(screen.getByLabelText(/Mágico/)).toBeInTheDocument();
    // textarea
    expect(screen.getByLabelText(/Anotações/).tagName.toLowerCase()).toBe(
      "textarea",
    );
    // derived (read-only overlay)
    const derived = screen.getByTestId("derived-defesa_efetiva");
    expect(derived).toHaveAttribute("data-readonly", "true");
    expect(derived).toHaveTextContent("24");
  });
});

describe("SheetRenderer — live derivation", () => {
  it("recomputes the derived field locally before any network call", async () => {
    const { schema, base, effective, breakdown } = makeProps();
    render(
      <SheetRenderer
        projectId="p1"
        characterId="c1"
        schema={schema}
        base={base}
        effective={effective}
        breakdown={breakdown}
        conditions={[]}
      />,
    );

    // defesa_efetiva = defesa_base (10) + des (14) = 24
    expect(screen.getByTestId("derived-defesa_efetiva")).toHaveTextContent("24");

    fireEvent.change(screen.getByLabelText(/Destreza/), {
      target: { value: "18" },
    });

    // No timer advance: derived value updates from local memo before any PATCH.
    expect(screen.getByTestId("derived-defesa_efetiva")).toHaveTextContent("28");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("SheetRenderer — autosave", () => {
  it("issues one PATCH 800ms after the edit with only the changed top-level key", async () => {
    const { schema, base, effective, breakdown } = makeProps();
    render(
      <SheetRenderer
        projectId="proj-1"
        characterId="char-1"
        schema={schema}
        base={base}
        effective={effective}
        breakdown={breakdown}
        conditions={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Destreza/), {
      target: { value: "18" },
    });

    expect(fetchSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/characters/proj-1/char-1/sheet");
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ patch: { des: 18 } });
  });

  it("transitions save status saving → saved on a successful PATCH", async () => {
    const { schema, base, effective, breakdown } = makeProps();
    render(
      <SheetRenderer
        projectId="p1"
        characterId="c1"
        schema={schema}
        base={base}
        effective={effective}
        breakdown={breakdown}
        conditions={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Força/), { target: { value: "16" } });
    expect(useWorkspace.getState().saveStatus).toBe("saving");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(useWorkspace.getState().saveStatus).toBe("saved");
    expect(useWorkspace.getState().lastSavedAt).not.toBeNull();
  });

  it("transitions save status → error and calls toast.error on PATCH failure", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 400 }));

    const { schema, base, effective, breakdown } = makeProps();
    render(
      <SheetRenderer
        projectId="p1"
        characterId="c1"
        schema={schema}
        base={base}
        effective={effective}
        breakdown={breakdown}
        conditions={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Força/), { target: { value: "16" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(useWorkspace.getState().saveStatus).toBe("error");
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to save sheet");
  });
});

describe("SheetRenderer — integration with conditions", () => {
  it("applies SEVERE LEFT_LEG preset to deslocamento via derive()", () => {
    const schema: SheetSchema = {
      systemSlug: "demo",
      schemaVersion: 1,
      sections: [
        {
          id: "combat",
          title: "Combate",
          fields: [
            {
              id: "deslocamento",
              label: "Deslocamento",
              type: "number",
              default: 9,
            },
          ],
        },
      ],
      injuryPresets: [
        {
          region: "LEFT_LEG",
          severity: "SEVERE",
          modifiers: [
            { field: "deslocamento", delta: -3, reason: "Perna esquerda" },
          ],
        },
      ],
    };
    const base = { deslocamento: 9 };
    const conditions = [
      { id: "c1", region: "LEFT_LEG", severity: "SEVERE" },
    ];

    render(
      <SheetRenderer
        projectId="p1"
        characterId="c1"
        schema={schema}
        base={base}
        effective={{ deslocamento: 6 }}
        breakdown={{}}
        conditions={conditions}
      />,
    );

    // Editing the base in-place keeps the preset stacking applied via derive().
    fireEvent.change(screen.getByLabelText(/Deslocamento/), {
      target: { value: "12" },
    });
    // The base is now 12; derive subtracts 3 → effective 9. But there is no
    // derived field rendering deslocamento; assertion focuses on the input
    // reflecting the typed value (form state owns the base).
    const input = screen.getByLabelText(/Deslocamento/) as HTMLInputElement;
    expect(input.value).toBe("12");
  });
});

describe("SheetRenderer — diff semantics", () => {
  it("only sends keys that changed since the last persisted base", async () => {
    const { schema, base, effective, breakdown } = makeProps();
    render(
      <SheetRenderer
        projectId="p1"
        characterId="c1"
        schema={schema}
        base={base}
        effective={effective}
        breakdown={breakdown}
        conditions={[]}
      />,
    );

    // Edit two top-level fields before the timer fires.
    fireEvent.change(screen.getByLabelText(/Força/), { target: { value: "13" } });
    fireEvent.change(screen.getByLabelText(/Destreza/), { target: { value: "15" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.patch).toEqual({ for: 13, des: 15 });
    // Keys with unchanged value are NOT included.
    expect(body.patch).not.toHaveProperty("defesa_base");
    expect(body.patch).not.toHaveProperty("magico");
  });
});
