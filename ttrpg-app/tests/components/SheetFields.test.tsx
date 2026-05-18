import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type Control } from "react-hook-form";
import { TextField } from "@/components/characters/sheet/fields/TextField";
import { TextareaField } from "@/components/characters/sheet/fields/TextareaField";
import { NumberField } from "@/components/characters/sheet/fields/NumberField";
import { CheckboxField } from "@/components/characters/sheet/fields/CheckboxField";
import { SelectField } from "@/components/characters/sheet/fields/SelectField";
import { DerivedField } from "@/components/characters/sheet/fields/DerivedField";
import type {
  BreakdownEntry,
  SheetField,
  SheetFormValues,
} from "@/lib/sheets/types";

type Stash = { values?: SheetFormValues };

function Harness({
  field,
  defaultValues,
  breakdown,
  stash,
}: {
  field: SheetField;
  defaultValues: SheetFormValues;
  breakdown?: BreakdownEntry[];
  stash: Stash;
}) {
  const form = useForm<SheetFormValues>({ defaultValues });
  stash.values = form.watch();
  // Re-stash whenever values change so tests can read the latest.
  form.watch((all) => {
    stash.values = all as SheetFormValues;
  });

  const control = form.control as unknown as Control<SheetFormValues>;
  switch (field.type) {
    case "text":
      return <TextField name={field.id} control={control} field={field} />;
    case "textarea":
      return <TextareaField name={field.id} control={control} field={field} />;
    case "number":
      return <NumberField name={field.id} control={control} field={field} />;
    case "checkbox":
      return <CheckboxField name={field.id} control={control} field={field} />;
    case "select":
      return <SelectField name={field.id} control={control} field={field} />;
    case "derived":
      return (
        <DerivedField
          name={field.id}
          control={control}
          field={field}
          breakdown={breakdown}
        />
      );
    default:
      return null;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TextField", () => {
  it("renders the value from RHF and updates state on change", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(
      <Harness
        field={{ id: "nome", type: "text", label: "Nome" }}
        defaultValues={{ nome: "Aria" }}
        stash={stash}
      />,
    );

    const input = screen.getByLabelText(/Nome/i) as HTMLInputElement;
    expect(input.value).toBe("Aria");

    await user.clear(input);
    await user.type(input, "Bria");

    expect(stash.values?.nome).toBe("Bria");
  });

  it("falls back to the field id as label when label is omitted", () => {
    const stash: Stash = {};
    render(
      <Harness
        field={{ id: "raw_id", type: "text" }}
        defaultValues={{ raw_id: "" }}
        stash={stash}
      />,
    );
    expect(screen.getByLabelText("raw_id")).toBeInTheDocument();
  });

  it("displays the unit suffix in the label", () => {
    const stash: Stash = {};
    render(
      <Harness
        field={{ id: "deslocamento", type: "text", label: "Deslocamento", unit: "m" }}
        defaultValues={{ deslocamento: "" }}
        stash={stash}
      />,
    );
    expect(screen.getByText(/\(m\)/)).toBeInTheDocument();
  });
});

describe("TextareaField", () => {
  it("updates RHF state on change", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(
      <Harness
        field={{ id: "bio", type: "textarea", label: "Bio" }}
        defaultValues={{ bio: "" }}
        stash={stash}
      />,
    );

    const area = screen.getByLabelText(/Bio/i) as HTMLTextAreaElement;
    await user.type(area, "linha 1");
    expect(stash.values?.bio).toBe("linha 1");
  });
});

describe("NumberField", () => {
  it("stores a number (not a string) in RHF state", async () => {
    const stash: Stash = {};
    render(
      <Harness
        field={{ id: "nivel", type: "number", label: "Nível", default: 1 }}
        defaultValues={{ nivel: 1 }}
        stash={stash}
      />,
    );

    const input = screen.getByLabelText(/Nível/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12" } });

    expect(stash.values?.nivel).toBe(12);
    expect(typeof stash.values?.nivel).toBe("number");
  });

  it("treats an empty input as empty string (not NaN)", () => {
    const stash: Stash = {};
    render(
      <Harness
        field={{ id: "xp", type: "number", label: "XP" }}
        defaultValues={{ xp: 5 }}
        stash={stash}
      />,
    );

    const input = screen.getByLabelText(/XP/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    expect(stash.values?.xp).toBe("");
  });
});

describe("CheckboxField", () => {
  it("toggles boolean state", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(
      <Harness
        field={{ id: "inspirado", type: "checkbox", label: "Inspirado" }}
        defaultValues={{ inspirado: false }}
        stash={stash}
      />,
    );

    const cb = screen.getByLabelText(/Inspirado/i);
    await user.click(cb);
    expect(stash.values?.inspirado).toBe(true);

    await user.click(cb);
    expect(stash.values?.inspirado).toBe(false);
  });
});

describe("SelectField", () => {
  it("only renders options declared in field.options", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(
      <Harness
        field={{
          id: "alinhamento",
          type: "select",
          label: "Alinhamento",
          options: ["Bom", "Neutro", "Mau"],
        }}
        defaultValues={{ alinhamento: "Bom" }}
        stash={stash}
      />,
    );

    const trigger = screen.getByLabelText(/Alinhamento/i);
    await user.click(trigger);

    const listbox = await screen.findByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    const labels = options.map((opt) => opt.textContent ?? "");
    expect(labels).toEqual(["Bom", "Neutro", "Mau"]);
  });
});

describe("DerivedField", () => {
  it("is not rendered as an editable input element", () => {
    const stash: Stash = {};
    render(
      <Harness
        field={{
          id: "defesa_efetiva",
          type: "derived",
          label: "Defesa efetiva",
          formula: "defesa_base + des",
        }}
        defaultValues={{ defesa_efetiva: 14 }}
        breakdown={[]}
        stash={stash}
      />,
    );

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByTestId("derived-defesa_efetiva")).toHaveAttribute(
      "data-readonly",
      "true",
    );
    expect(screen.getByTestId("derived-defesa_efetiva")).toHaveTextContent(
      "14",
    );
  });

  it("renders a tooltip listing every breakdown entry on hover", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    const breakdown: BreakdownEntry[] = [
      { source: "preset", delta: -3, reason: "Perna esquerda severamente ferida", conditionId: "c1" },
      { source: "override", delta: -1, reason: "Mancando", conditionId: "c2" },
      { source: "formula", reason: "from defesa_base, des" },
    ];

    render(
      <Harness
        field={{
          id: "defesa_efetiva",
          type: "derived",
          label: "Defesa efetiva",
          formula: "defesa_base + des",
        }}
        defaultValues={{ defesa_efetiva: 6 }}
        breakdown={breakdown}
        stash={stash}
      />,
    );

    const trigger = screen.getByTestId("derived-defesa_efetiva");
    await act(async () => {
      await user.hover(trigger);
    });

    // Radix tooltip renders into a portal; query by text.
    const allText = (await screen.findAllByText(/Perna esquerda/)).at(-1);
    expect(allText).toBeDefined();
    expect(screen.getAllByText(/Mancando/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/from defesa_base, des/).length).toBeGreaterThan(
      0,
    );
  });
});

describe("All six field types — RHF round trip", () => {
  function FullForm({ stash }: { stash: Stash }) {
    const form = useForm<SheetFormValues>({
      defaultValues: {
        nome: "",
        bio: "",
        nivel: 0,
        inspirado: false,
        alinhamento: "Bom",
        defesa_efetiva: 12,
      },
    });
    stash.values = form.watch();
    form.watch((all) => {
      stash.values = all as SheetFormValues;
    });
    const control = form.control as unknown as Control<SheetFormValues>;

    return (
      <div>
        <TextField
          name="nome"
          control={control}
          field={{ id: "nome", type: "text", label: "Nome" }}
        />
        <TextareaField
          name="bio"
          control={control}
          field={{ id: "bio", type: "textarea", label: "Bio" }}
        />
        <NumberField
          name="nivel"
          control={control}
          field={{ id: "nivel", type: "number", label: "Nível" }}
        />
        <CheckboxField
          name="inspirado"
          control={control}
          field={{ id: "inspirado", type: "checkbox", label: "Inspirado" }}
        />
        <SelectField
          name="alinhamento"
          control={control}
          field={{
            id: "alinhamento",
            type: "select",
            label: "Alinhamento",
            options: ["Bom", "Neutro", "Mau"],
          }}
        />
        <DerivedField
          name="defesa_efetiva"
          control={control}
          field={{
            id: "defesa_efetiva",
            type: "derived",
            label: "Defesa efetiva",
            formula: "defesa_base + des",
          }}
          breakdown={[{ source: "formula", reason: "from defesa_base, des" }]}
        />
      </div>
    );
  }

  it("each field type updates RHF state correctly", async () => {
    const user = userEvent.setup();
    const stash: Stash = {};
    render(<FullForm stash={stash} />);

    await user.type(screen.getByLabelText(/Nome/i), "Aria");
    await user.type(screen.getByLabelText(/Bio/i), "Maga errante");
    fireEvent.change(screen.getByLabelText(/Nível/i), { target: { value: "3" } });
    await user.click(screen.getByLabelText(/Inspirado/i));

    expect(stash.values?.nome).toBe("Aria");
    expect(stash.values?.bio).toBe("Maga errante");
    expect(stash.values?.nivel).toBe(3);
    expect(stash.values?.inspirado).toBe(true);
    // Derived field value is whatever the form already carries — not editable.
    expect(stash.values?.defesa_efetiva).toBe(12);
  });
});
