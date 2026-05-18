"use client";

import { Controller, type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FieldShell } from "./FieldShell";
import type {
  BreakdownEntry,
  SheetField,
  SheetFormValues,
} from "@/lib/sheets/types";

export interface TextFieldProps {
  name: string;
  control: Control<SheetFormValues>;
  field: SheetField;
  breakdown?: BreakdownEntry[];
}

export function TextField({ name, control, field }: TextFieldProps) {
  return (
    <FieldShell
      htmlFor={name}
      label={field.label}
      fallbackLabel={field.id}
      unit={field.unit}
    >
      <Controller
        control={control}
        name={name}
        render={({ field: rhf }) => (
          <Input
            id={name}
            type="text"
            value={typeof rhf.value === "string" ? rhf.value : ""}
            onChange={(e) => rhf.onChange(e.target.value)}
            onBlur={rhf.onBlur}
            ref={rhf.ref}
          />
        )}
      />
    </FieldShell>
  );
}
