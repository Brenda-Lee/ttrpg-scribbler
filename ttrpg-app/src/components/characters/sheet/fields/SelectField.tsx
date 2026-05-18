"use client";

import { Controller, type Control } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldShell } from "./FieldShell";
import type {
  BreakdownEntry,
  SheetField,
  SheetFormValues,
} from "@/lib/sheets/types";

export interface SelectFieldProps {
  name: string;
  control: Control<SheetFormValues>;
  field: SheetField;
  breakdown?: BreakdownEntry[];
}

export function SelectField({ name, control, field }: SelectFieldProps) {
  const options = field.options ?? [];
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
          <Select
            value={typeof rhf.value === "string" ? rhf.value : undefined}
            onValueChange={(value) => rhf.onChange(value)}
          >
            <SelectTrigger id={name} ref={rhf.ref}>
              <SelectValue placeholder="Selecionar…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FieldShell>
  );
}
