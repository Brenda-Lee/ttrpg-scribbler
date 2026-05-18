import { parseSheetSchema } from "./parser";
import type { SheetSchema } from "./types";

import genericRaw from "../../../prisma/sheets/generic.json" assert { type: "json" };
import dnd5eRaw from "../../../prisma/sheets/dnd-5e.json" assert { type: "json" };
import tormenta20Raw from "../../../prisma/sheets/tormenta20.json" assert { type: "json" };

export const BUNDLED_SCHEMAS: Record<string, SheetSchema> = {
  generic: parseSheetSchema(genericRaw),
  "dnd-5e": parseSheetSchema(dnd5eRaw),
  tormenta20: parseSheetSchema(tormenta20Raw),
};

export const GENERIC_SLUG = "generic";
