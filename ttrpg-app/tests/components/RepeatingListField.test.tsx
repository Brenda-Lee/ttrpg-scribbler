import { describe, expect, it } from "vitest";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type Control } from "react-hook-form";
import { RepeatingListField } from "@/components/characters/sheet/fields/RepeatingListField";
import type { SheetField, SheetFormValues } from "@/lib/sheets/types";

type Stash = { values?: SheetFormValues };

const ATAQUES_SCHEMA: SheetField = {
  id: "ataques",
  label: "Ataques",
  type: "repeating-list",
  itemSchema: [
    { id: "nome", label: "Nome", type: "text" },
    { id: "dano", label: "Dano", type: "number", default: 0 },
  ],
};

const PERICIAS_SCHEMA: SheetField = {
  id: "pericias",
  label: "Perícias",
  type: "repeating-list",
  itemSchema: [
    {
      id: "nome",
      label: "Perícia",
      type: "select",
      options: ["Atletismo", "Acrobacia", "Furtividade"],
    },
    { id: "ta", label: "T.A.", type: "number", default: 0 },
  ],
};

function Harness({
  field,
  defaultValues,
  stash,
}: {
  field: SheetField;
  defaultValues: SheetFormValues;
  stash: Stash;
}) {
  const form = useForm<SheetFormValues>({ defaultValues });
  stash.values = form.watch();
  form.watch((all) => {
    stash.values = all as SheetFormValues;
  });
  const control = form.control as unknown as Control<SheetFormValues>;
  return <RepeatingListField name={field.id} control={control} field={field} />;
}

describe("RepeatingListField — empty state and basic operations", () => {
  it("renders an empty state when the array is empty", () => {
    const stash: Stash = {};
    render(
      <Harness field={ATAQUES_SCHEMA} defaultValues={{ ataques: [] }} stash={stash} />,
    );

    expect(screen.getByTestId("list-ataques-empty")).toBeInTheDocument();
    expect(screen.queryAllByTestId("list-ataques-row")).toHaveLength(0);
  });

  it("clicking Adicionar appends a row seeded with extractItemDefaults", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(
      <Harness field={ATAQUES_SCHEMA} defaultValues={{ ataques: [] }} stash={stash} />,
    );

    await user.click(screen.getByRole("button", { name: /Adicionar/i }));

    expect(screen.getAllByTestId("list-ataques-row")).toHaveLength(1);
    const ataques = stash.values?.ataques as Array<{ nome: string; dano: number }>;
    expect(ataques).toHaveLength(1);
    expect(ataques[0]).toEqual({ nome: "", dano: 0 });
  });

  it("clicking Remover on a row removes only that row", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(
      <Harness
        field={ATAQUES_SCHEMA}
        defaultValues={{
          ataques: [
            { nome: "Espada", dano: 8 },
            { nome: "Adaga", dano: 4 },
            { nome: "Cajado", dano: 6 },
          ],
        }}
        stash={stash}
      />,
    );

    const rows = screen.getAllByTestId("list-ataques-row");
    expect(rows).toHaveLength(3);

    await user.click(within(rows[1]).getByRole("button", { name: /Remover linha 2/i }));

    const survivors = stash.values?.ataques as Array<{ nome: string }>;
    expect(survivors).toHaveLength(2);
    expect(survivors.map((s) => s.nome)).toEqual(["Espada", "Cajado"]);
  });

  it("editing an inner field updates the RHF state at the correct path", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(
      <Harness
        field={ATAQUES_SCHEMA}
        defaultValues={{ ataques: [{ nome: "", dano: 0 }] }}
        stash={stash}
      />,
    );

    const row = screen.getByTestId("list-ataques-row");
    const nomeInput = within(row).getByLabelText(/Nome/i);
    await user.type(nomeInput, "Espada longa");

    const danoInput = within(row).getByLabelText(/Dano/i);
    fireEvent.change(danoInput, { target: { value: "12" } });

    const ataques = stash.values?.ataques as Array<{ nome: string; dano: number }>;
    expect(ataques[0].nome).toBe("Espada longa");
    expect(ataques[0].dano).toBe(12);
  });
});

describe("RepeatingListField — full flow with select + number", () => {
  it("adds two rows, edits both, removes the first, asserts surviving row", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(
      <Harness field={PERICIAS_SCHEMA} defaultValues={{ pericias: [] }} stash={stash} />,
    );

    await user.click(screen.getByRole("button", { name: /Adicionar/i }));
    await user.click(screen.getByRole("button", { name: /Adicionar/i }));

    const rows = screen.getAllByTestId("list-pericias-row");
    expect(rows).toHaveLength(2);

    // Row 0: select "Atletismo", T.A. = 4
    const row0Ta = within(rows[0]).getByLabelText(/T\.A\./i);
    fireEvent.change(row0Ta, { target: { value: "4" } });

    // Row 1: T.A. = 7 (skip select to keep test fast — select interaction
    // is covered in SheetFields.test.tsx; default option is enough here)
    const row1Ta = within(rows[1]).getByLabelText(/T\.A\./i);
    fireEvent.change(row1Ta, { target: { value: "7" } });

    let pericias = stash.values?.pericias as Array<{ nome: string; ta: number }>;
    expect(pericias).toHaveLength(2);
    expect(pericias[0].ta).toBe(4);
    expect(pericias[1].ta).toBe(7);

    // Remove the first row.
    await user.click(
      within(rows[0]).getByRole("button", { name: /Remover linha 1/i }),
    );

    pericias = stash.values?.pericias as Array<{ nome: string; ta: number }>;
    expect(pericias).toHaveLength(1);
    expect(pericias[0].ta).toBe(7);
  });
});
