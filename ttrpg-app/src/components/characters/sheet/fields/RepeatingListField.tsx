"use client";

import { useFieldArray, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { extractItemDefaults } from "@/lib/sheets/defaults";
import type { SheetField, SheetFormValues } from "@/lib/sheets/types";
import { TextField } from "./TextField";
import { TextareaField } from "./TextareaField";
import { NumberField } from "./NumberField";
import { CheckboxField } from "./CheckboxField";
import { SelectField } from "./SelectField";

export interface RepeatingListFieldProps {
  name: string;
  control: Control<SheetFormValues>;
  field: SheetField;
}

function renderInnerField({
  inner,
  rowName,
  control,
}: {
  inner: SheetField;
  rowName: string;
  control: Control<SheetFormValues>;
}) {
  const path = `${rowName}.${inner.id}`;
  switch (inner.type) {
    case "text":
      return <TextField key={inner.id} name={path} control={control} field={inner} />;
    case "textarea":
      return (
        <TextareaField key={inner.id} name={path} control={control} field={inner} />
      );
    case "number":
      return <NumberField key={inner.id} name={path} control={control} field={inner} />;
    case "checkbox":
      return (
        <CheckboxField key={inner.id} name={path} control={control} field={inner} />
      );
    case "select":
      return <SelectField key={inner.id} name={path} control={control} field={inner} />;
    case "derived":
    case "repeating-list":
    default:
      return null;
  }
}

export function RepeatingListField({
  name,
  control,
  field,
}: RepeatingListFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as unknown as never,
  });
  const itemSchema = field.itemSchema ?? [];
  const labelText = field.label ?? field.id;

  return (
    <div className="flex flex-col gap-2" data-testid={`list-${name}`}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">
          {labelText}
        </Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const defaults = extractItemDefaults(itemSchema);
            append(defaults as Parameters<typeof append>[0]);
          }}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>
      {fields.length === 0 ? (
        <p
          data-testid={`list-${name}-empty`}
          className="rounded-md border border-dashed border-input/60 p-4 text-center text-sm text-muted-foreground"
        >
          Nenhum item. Use “Adicionar” para começar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {fields.map((row, index) => {
            const rowName = `${name}.${index}`;
            return (
              <li
                key={row.id}
                data-testid={`list-${name}-row`}
                className="rounded-md border border-input/60 p-3"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {itemSchema.map((inner) =>
                    renderInnerField({ inner, rowName, control }),
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(index)}
                    aria-label={`Remover linha ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
