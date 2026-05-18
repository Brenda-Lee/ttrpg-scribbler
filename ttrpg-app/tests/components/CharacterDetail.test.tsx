import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { toastErrorMock, routerPushMock, routerRefreshMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: vi.fn(), loading: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
}));

import { CharacterDetailClient } from "@/components/characters/CharacterDetailClient";
import type { SheetSchema } from "@/lib/sheets/types";
import { useWorkspace } from "@/stores/workspace";

function makeProps(overrides?: { systemSlug?: string; schemaVersion?: number }) {
  const schema: SheetSchema = {
    systemSlug: overrides?.systemSlug ?? "tormenta20",
    schemaVersion: overrides?.schemaVersion ?? 1,
    sections: [
      {
        id: "attributes",
        title: "Atributos",
        fields: [
          { id: "for", label: "Força", type: "number", default: 0 },
          { id: "des", label: "Destreza", type: "number", default: 0 },
        ],
      },
      {
        id: "combat",
        title: "Combate",
        fields: [
          { id: "defesa_base", label: "Defesa base", type: "number", default: 10 },
        ],
      },
    ],
    injuryPresets: [],
  };
  return {
    projectId: "p1",
    character: {
      id: "c1",
      name: "Aria",
      role: "PC",
      bio: "Maga errante.",
      attributesJson: JSON.stringify({ classe: "Maga" }),
    },
    sheet: {
      schema,
      base: { for: 12, des: 14, defesa_base: 10 },
      effective: { for: 12, des: 14, defesa_base: 10 },
      breakdown: {},
      conditions: [],
    },
  };
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  toastErrorMock.mockReset();
  routerPushMock.mockReset();
  routerRefreshMock.mockReset();
  useWorkspace.setState({ saveStatus: "idle", lastSavedAt: null });
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.endsWith("/conditions")) {
      return Promise.resolve(
        new Response(JSON.stringify({ conditions: [] }), { status: 200 }),
      );
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CharacterDetailClient — tabs", () => {
  it("renders three tabs with the correct labels and Resumo selected by default", () => {
    const props = makeProps();
    render(<CharacterDetailClient {...props} />);

    expect(screen.getByRole("tab", { name: /Resumo/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByRole("tab", { name: /Ficha/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Condições/i })).toBeInTheDocument();

    // Resumo content visible: biografia + atributos textareas.
    expect(screen.getByLabelText(/Biografia/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Atributos \(JSON livre\)/)).toBeInTheDocument();
  });

  it("shows a system + schema version badge on the Ficha tab", () => {
    const props = makeProps({ systemSlug: "tormenta20", schemaVersion: 1 });
    render(<CharacterDetailClient {...props} />);

    const badge = screen.getByTestId("sheet-version-badge");
    expect(badge).toHaveTextContent("Tormenta 20");
    expect(badge).toHaveTextContent("v1");
  });

  it("falls back to the slug when system label is unknown", () => {
    const props = makeProps({ systemSlug: "custom-system", schemaVersion: 2 });
    render(<CharacterDetailClient {...props} />);

    const badge = screen.getByTestId("sheet-version-badge");
    expect(badge).toHaveTextContent("custom-system");
    expect(badge).toHaveTextContent("v2");
  });

  it("clicking Ficha mounts SheetRenderer (section heading visible)", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<CharacterDetailClient {...props} />);

    await user.click(screen.getByRole("tab", { name: /Ficha/i }));

    // Section title "Atributos" comes from the SheetRenderer (and there is also
    // a section called "Combate"); assert both are present.
    expect(await screen.findByText("Atributos")).toBeInTheDocument();
    expect(screen.getByText("Combate")).toBeInTheDocument();
  });

  it("clicking Condições mounts BodyMap (12 region buttons rendered)", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<CharacterDetailClient {...props} />);

    await user.click(screen.getByRole("tab", { name: /Condições/i }));

    // BodyMap renders 12 region elements (one per BODY_REGIONS entry), each
    // exposing role="button" via the SVG nodes. Look for at least 12 buttons
    // within the Condições panel.
    const panel = screen.getByRole("tabpanel", { name: /Condições/i });
    const regions = within(panel).getAllByRole("button");
    expect(regions.length).toBeGreaterThanOrEqual(12);
  });
});

describe("CharacterDetailClient — Ficha state persistence across tab switches", () => {
  it("keeps SheetRenderer mounted while on Resumo (forceMount)", () => {
    const props = makeProps();
    render(<CharacterDetailClient {...props} />);

    // Resumo é o padrão, mas Ficha deve estar no DOM (oculta via classe).
    const section = document.querySelector('[data-testid="section-attributes"]');
    expect(section).not.toBeNull();
  });

  it("preserves typed values in Ficha after switching tabs and back", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<CharacterDetailClient {...props} />);

    // Vai para a Ficha e edita um campo numérico.
    await user.click(screen.getByRole("tab", { name: /Ficha/i }));
    const forInput = screen.getByLabelText(/Força/) as HTMLInputElement;
    fireEvent.change(forInput, { target: { value: "17" } });
    expect((screen.getByLabelText(/Força/) as HTMLInputElement).value).toBe("17");

    // Sai para Condições.
    await user.click(screen.getByRole("tab", { name: /Condições/i }));

    // Volta para a Ficha — o valor digitado precisa continuar lá (o RHF não
    // foi desmontado).
    await user.click(screen.getByRole("tab", { name: /Ficha/i }));
    expect((screen.getByLabelText(/Força/) as HTMLInputElement).value).toBe("17");
  });
});

describe("CharacterDetailClient — header interactions", () => {
  it("typing in the name input and changing the role updates the PATCH body", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<CharacterDetailClient {...props} />);

    const nameInput = screen.getByLabelText(/Nome do personagem/) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, "Bria");

    const roleSelect = screen.getByLabelText(/Tipo do personagem/) as HTMLSelectElement;
    await user.selectOptions(roleSelect, "VILLAIN");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Salvar/i }));
    });

    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Bria");
    expect(body.role).toBe("VILLAIN");
  });

  it("delete button issues DELETE and navigates back to the characters list", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CharacterDetailClient {...props} />);

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /Remover personagem/i }),
      );
    });

    const deleteCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "DELETE",
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall![0]).toBe("/api/characters/p1/c1");

    expect(routerPushMock).toHaveBeenCalledWith("/projects/p1/characters");
    confirmSpy.mockRestore();
  });

  it("delete button aborts when the user cancels the confirm dialog", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CharacterDetailClient {...props} />);

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /Remover personagem/i }),
      );
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(routerPushMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe("CharacterDetailClient — Resumo save", () => {
  it("saving in Resumo PATCHes /api/characters/[projectId]/[characterId]", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<CharacterDetailClient {...props} />);

    const bio = screen.getByLabelText(/Biografia/) as HTMLTextAreaElement;
    await user.clear(bio);
    await user.type(bio, "Nova bio");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Salvar/i }));
    });

    expect(fetchSpy).toHaveBeenCalled();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/characters/p1/c1");
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string);
    expect(body.bio).toBe("Nova bio");
    expect(body.name).toBe("Aria");
    expect(body.role).toBe("PC");
    expect(body.attributesJson).toEqual({ classe: "Maga" });

    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("toast.error fires when the attrsJson is malformed", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<CharacterDetailClient {...props} />);

    const attrs = screen.getByLabelText(/Atributos \(JSON livre\)/);
    // user.type interprets `{` as a key escape; use fireEvent.change to set a
    // raw malformed JSON value directly.
    (attrs as HTMLTextAreaElement).value = "";
    attrs.dispatchEvent(new Event("input", { bubbles: true }));
    await user.type(attrs, "{{not json");

    await user.click(screen.getByRole("button", { name: /Salvar/i }));

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Atributos não estão em JSON válido.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
