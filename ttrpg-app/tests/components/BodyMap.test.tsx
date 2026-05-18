import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BODY_REGIONS, SEVERITY_COLOR } from "@/lib/bodyRegions";

const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock, loading: vi.fn() },
}));

import { BodyMap, type Condition } from "@/components/characters/BodyMap";

type FetchHandler = (
  url: string,
  init: RequestInit | undefined,
) => Promise<Response> | Response | null;

let handler: FetchHandler;
let fetchSpy: ReturnType<typeof vi.spyOn>;

function makeCondition(overrides: Partial<Condition> = {}): Condition {
  return {
    id: overrides.id ?? "c-1",
    region: overrides.region ?? "LEFT_LEG",
    severity: overrides.severity ?? "SEVERE",
    description: overrides.description ?? null,
    modifiersJson: overrides.modifiersJson ?? null,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

beforeEach(() => {
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url =
      typeof input === "string" ? input : (input as Request).url ?? "";
    const result = handler(url, init);
    if (result instanceof Response) return Promise.resolve(result);
    if (result) return Promise.resolve(result);
    return Promise.resolve(
      new Response(JSON.stringify({ conditions: [] }), { status: 200 }),
    );
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BodyMap — SVG region rendering", () => {
  it("renders one clickable element per BODY_REGIONS entry (12 in total)", async () => {
    handler = () =>
      new Response(JSON.stringify({ conditions: [] }), { status: 200 });

    await act(async () => {
      render(<BodyMap projectId="p1" characterId="c1" />);
    });

    for (const region of BODY_REGIONS) {
      const node = document.querySelector(`[data-region="${region}"]`);
      expect(node).not.toBeNull();
      expect(node).toHaveAttribute("role", "button");
    }
    expect(document.querySelectorAll("[data-region]")).toHaveLength(
      BODY_REGIONS.length,
    );
  });

  it("opens the new-condition dialog when a region without active conditions is clicked", async () => {
    handler = () =>
      new Response(JSON.stringify({ conditions: [] }), { status: 200 });
    const user = userEvent.setup();

    await act(async () => {
      render(<BodyMap projectId="p1" characterId="c1" />);
    });

    const headRegion = document.querySelector('[data-region="HEAD"]')!;
    await user.click(headRegion);

    expect(
      await screen.findByText(/Nova condição em Cabeça/i),
    ).toBeInTheDocument();
  });
});

describe("BodyMap — severity colouring and badges", () => {
  it("fills a region with the SEVERE colour when one SEVERE condition is active", async () => {
    handler = (url) => {
      if (url.endsWith("/conditions")) {
        return new Response(
          JSON.stringify({
            conditions: [makeCondition({ region: "LEFT_LEG", severity: "SEVERE" })],
          }),
          { status: 200 },
        );
      }
      return null;
    };

    await act(async () => {
      render(<BodyMap projectId="p1" characterId="c1" />);
    });

    const leg = document.querySelector('[data-region="LEFT_LEG"]')!;
    expect(leg.getAttribute("fill")).toBe(SEVERITY_COLOR.SEVERE);
  });

  it("shows a count badge of 2 when two conditions target the same region", async () => {
    handler = (url) => {
      if (url.endsWith("/conditions")) {
        return new Response(
          JSON.stringify({
            conditions: [
              makeCondition({ id: "a", region: "HEAD", severity: "MODERATE" }),
              makeCondition({ id: "b", region: "HEAD", severity: "CRITICAL" }),
            ],
          }),
          { status: 200 },
        );
      }
      return null;
    };

    await act(async () => {
      render(<BodyMap projectId="p1" characterId="c1" />);
    });

    const badge = await screen.findByTestId("badge-HEAD");
    expect(badge).toHaveTextContent("2");

    // Worst-severity wins: CRITICAL.
    expect(
      document.querySelector('[data-region="HEAD"]')!.getAttribute("fill"),
    ).toBe(SEVERITY_COLOR.CRITICAL);
  });
});

describe("BodyMap — modifiers dialog and PATCH", () => {
  it("PATCHes the conditions endpoint with the new modifiersJson and emits onConditionsChange", async () => {
    const onConditionsChange = vi.fn();
    const initial = makeCondition({
      id: "c-1",
      region: "LEFT_LEG",
      severity: "SEVERE",
      modifiersJson: null,
    });
    const updated = makeCondition({
      ...initial,
      modifiersJson: JSON.stringify([
        { field: "deslocamento", delta: -3, reason: "Mancando" },
      ]),
    });
    let conditions: Condition[] = [initial];

    handler = (url, init) => {
      if (init?.method === "PATCH" && url.endsWith("/conditions/c-1")) {
        conditions = [updated];
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.endsWith("/conditions")) {
        return new Response(JSON.stringify({ conditions }), { status: 200 });
      }
      return null;
    };

    const user = userEvent.setup();
    await act(async () => {
      render(
        <BodyMap
          projectId="proj-1"
          characterId="char-1"
          onConditionsChange={onConditionsChange}
        />,
      );
    });

    // Wait for the load() to populate the side list before interacting.
    expect(await screen.findByText("Perna esquerda")).toBeInTheDocument();

    // Initial load fires onConditionsChange once with the seeded array.
    expect(onConditionsChange).toHaveBeenCalled();
    onConditionsChange.mockClear();

    await user.click(
      screen.getByRole("button", { name: /Modificadores/i }),
    );

    // Add a row, fill it in, save.
    await user.click(screen.getByTestId("modifiers-add"));

    const rows = await screen.findAllByTestId("modifier-row");
    const lastRow = rows[rows.length - 1];

    const fieldInput = within(lastRow).getByLabelText(/Campo/);
    await user.type(fieldInput, "deslocamento");
    const deltaInput = within(lastRow).getByLabelText(/Delta/);
    fireEvent.change(deltaInput, { target: { value: "-3" } });
    const reasonInput = within(lastRow).getByLabelText(/Motivo/);
    await user.type(reasonInput, "Mancando");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Salvar$/ }));
    });

    const patchCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    const [patchUrl, patchInit] = patchCall! as [string, RequestInit];
    expect(patchUrl).toBe("/api/characters/proj-1/char-1/conditions/c-1");
    const patchBody = JSON.parse(patchInit.body as string);
    expect(patchBody.modifiersJson).toEqual([
      { field: "deslocamento", delta: -3, reason: "Mancando" },
    ]);

    // After the PATCH succeeds the component reloads conditions and re-emits.
    expect(onConditionsChange).toHaveBeenCalled();
    const lastEmit =
      onConditionsChange.mock.calls[
        onConditionsChange.mock.calls.length - 1
      ][0];
    expect(lastEmit).toHaveLength(1);
    expect(lastEmit[0].modifiersJson).toContain("deslocamento");
  });

  it("creating a new condition POSTs the conditions endpoint and reloads", async () => {
    const onConditionsChange = vi.fn();
    let conditions: Condition[] = [];

    handler = (url, init) => {
      if (init?.method === "POST" && url.endsWith("/conditions")) {
        conditions = [
          makeCondition({
            id: "new-1",
            region: "HEAD",
            severity: "MODERATE",
            description: "Concussão leve",
          }),
        ];
        return new Response(
          JSON.stringify({ condition: conditions[0] }),
          { status: 201 },
        );
      }
      if (url.endsWith("/conditions")) {
        return new Response(JSON.stringify({ conditions }), { status: 200 });
      }
      return null;
    };

    const user = userEvent.setup();
    await act(async () => {
      render(
        <BodyMap
          projectId="p"
          characterId="c"
          onConditionsChange={onConditionsChange}
        />,
      );
    });

    const head = document.querySelector('[data-region="HEAD"]')!;
    await user.click(head);

    await user.click(screen.getByRole("button", { name: /Adicionar/i }));

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(postCall![0]).toMatch(/\/conditions$/);

    // After load, onConditionsChange receives the new array.
    const lastEmit =
      onConditionsChange.mock.calls[
        onConditionsChange.mock.calls.length - 1
      ][0];
    expect(lastEmit).toHaveLength(1);
    expect(lastEmit[0].region).toBe("HEAD");
  });

  it("editing severity from the edit dialog PATCHes the conditions endpoint", async () => {
    const initial = makeCondition({
      id: "c-edit",
      region: "TORSO_FRONT",
      severity: "LIGHT",
    });
    let conditions: Condition[] = [initial];

    handler = (url, init) => {
      if (init?.method === "PATCH" && url.endsWith("/conditions/c-edit")) {
        conditions = [{ ...initial, severity: "CRITICAL" }];
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.endsWith("/conditions")) {
        return new Response(JSON.stringify({ conditions }), { status: 200 });
      }
      return null;
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<BodyMap projectId="p" characterId="c" />);
    });

    expect(await screen.findByText("Tronco \(frente\)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Editar/i }));

    // Click the CRITICAL severity tile inside the edit dialog.
    await user.click(screen.getByRole("button", { name: /Crítica/i }));

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Salvar$/ }));
    });

    const patch = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patch).toBeDefined();
    const body = JSON.parse((patch![1] as RequestInit).body as string);
    expect(body.severity).toBe("CRITICAL");
  });

  it("deleting a condition issues DELETE and reloads the list", async () => {
    let conditions: Condition[] = [
      makeCondition({ id: "c-del", region: "LEFT_ARM" }),
    ];

    handler = (url, init) => {
      if (init?.method === "DELETE" && url.endsWith("/conditions/c-del")) {
        conditions = [];
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.endsWith("/conditions")) {
        return new Response(JSON.stringify({ conditions }), { status: 200 });
      }
      return null;
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<BodyMap projectId="p" characterId="c" />);
    });

    expect(await screen.findByText("Braço esquerdo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Editar/i }));

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Remover/i }));
    });

    const del = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "DELETE",
    );
    expect(del).toBeDefined();
    expect(del![0]).toMatch(/\/conditions\/c-del$/);
  });

  it("toast.error fires when the create/update/delete endpoint fails", async () => {
    handler = (url, init) => {
      if (init?.method === "POST" && url.endsWith("/conditions")) {
        return new Response(null, { status: 500 });
      }
      if (url.endsWith("/conditions")) {
        return new Response(JSON.stringify({ conditions: [] }), { status: 200 });
      }
      return null;
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<BodyMap projectId="p" characterId="c" />);
    });

    const head = document.querySelector('[data-region="HEAD"]')!;
    await user.click(head);
    await user.click(screen.getByRole("button", { name: /Adicionar/i }));

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Não foi possível salvar a condição.",
    );
  });

  it("dropping all modifier rows sends modifiersJson: null to clear the column", async () => {
    const onConditionsChange = vi.fn();
    const initial = makeCondition({
      id: "c-2",
      modifiersJson: JSON.stringify([
        { field: "for", delta: -2 },
      ]),
    });
    let conditions: Condition[] = [initial];

    handler = (url, init) => {
      if (init?.method === "PATCH" && url.endsWith("/conditions/c-2")) {
        conditions = [{ ...initial, modifiersJson: null }];
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.endsWith("/conditions")) {
        return new Response(JSON.stringify({ conditions }), { status: 200 });
      }
      return null;
    };

    const user = userEvent.setup();
    await act(async () => {
      render(
        <BodyMap
          projectId="p"
          characterId="c"
          onConditionsChange={onConditionsChange}
        />,
      );
    });

    expect(await screen.findByText("Perna esquerda")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Modificadores/i }),
    );

    // The existing row should be present — remove it.
    const removeButtons = await screen.findAllByRole("button", {
      name: /Remover modificador/i,
    });
    await user.click(removeButtons[0]);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Salvar$/ }));
    });

    const patchCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    const init = patchCall![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.modifiersJson).toBeNull();
  });
});
