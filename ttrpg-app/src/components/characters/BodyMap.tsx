"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import {
  BODY_REGION_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  CONDITION_SEVERITIES,
  type BodyRegion,
  type ConditionSeverity,
} from "@/lib/bodyRegions";

type Condition = {
  id: string;
  region: BodyRegion;
  severity: ConditionSeverity;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  projectId: string;
  characterId: string;
};

export function BodyMap({ projectId, characterId }: Props) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerRegion, setPickerRegion] = useState<BodyRegion | null>(null);
  const [editing, setEditing] = useState<Condition | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/characters/${projectId}/${characterId}/conditions`);
      if (!res.ok) return;
      const data = (await res.json()) as { conditions: Condition[] };
      setConditions(data.conditions);
    } finally {
      setLoading(false);
    }
  }, [projectId, characterId]);

  useEffect(() => {
    load();
  }, [load]);

  const worstByRegion = useMemo(() => {
    const map = new Map<BodyRegion, ConditionSeverity>();
    const order: ConditionSeverity[] = ["LIGHT", "MODERATE", "SEVERE", "CRITICAL"];
    for (const c of conditions) {
      const prev = map.get(c.region);
      const prevIdx = prev ? order.indexOf(prev) : -1;
      const curIdx = order.indexOf(c.severity);
      if (curIdx > prevIdx) map.set(c.region, c.severity);
    }
    return map;
  }, [conditions]);

  async function createCondition(region: BodyRegion, severity: ConditionSeverity, description: string) {
    const res = await fetch(`/api/characters/${projectId}/${characterId}/conditions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region, severity, description: description || undefined }),
    });
    if (!res.ok) {
      toast.error("Não foi possível salvar a condição.");
      return;
    }
    toast.success("Condição registrada.");
    await load();
    setPickerRegion(null);
  }

  async function updateCondition(id: string, patch: Partial<Pick<Condition, "severity" | "description">>) {
    const res = await fetch(`/api/characters/${projectId}/${characterId}/conditions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    await load();
    setEditing(null);
  }

  async function removeCondition(id: string) {
    const res = await fetch(`/api/characters/${projectId}/${characterId}/conditions/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Condição removida.");
    await load();
    setEditing(null);
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Condições / Ferimentos {loading ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}
        </h3>
        <div className="flex flex-wrap gap-1 text-[10px]">
          {CONDITION_SEVERITIES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SEVERITY_COLOR[s] }}
              />
              {SEVERITY_LABEL[s]}
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
        <BodySvg
          worstByRegion={worstByRegion}
          onSelectRegion={(r) => setPickerRegion(r)}
        />

        <div className="space-y-1.5">
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma condição registrada. Clique em uma região do mapa para adicionar.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {conditions.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2 rounded-md border px-2 py-1.5"
                >
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLOR[c.severity] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {BODY_REGION_LABEL[c.region]}
                      </span>
                      <Badge variant="secondary" className="text-[9px]">
                        {SEVERITY_LABEL[c.severity]}
                      </Badge>
                    </div>
                    {c.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setEditing(c)}
                  >
                    Editar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NewConditionDialog
        region={pickerRegion}
        onCancel={() => setPickerRegion(null)}
        onConfirm={(severity, desc) => {
          if (pickerRegion) createCondition(pickerRegion, severity, desc);
        }}
      />

      <EditConditionDialog
        condition={editing}
        onCancel={() => setEditing(null)}
        onUpdate={updateCondition}
        onDelete={removeCondition}
      />
    </section>
  );
}

function BodySvg({
  worstByRegion,
  onSelectRegion,
}: {
  worstByRegion: Map<BodyRegion, ConditionSeverity>;
  onSelectRegion: (r: BodyRegion) => void;
}) {
  function fillFor(region: BodyRegion): string {
    const sev = worstByRegion.get(region);
    return sev ? SEVERITY_COLOR[sev] : "#e5e7eb"; // gray-200
  }

  function strokeFor(region: BodyRegion): string {
    return worstByRegion.has(region) ? "#1f2937" : "#9ca3af";
  }

  const regionProps = (region: BodyRegion) => ({
    fill: fillFor(region),
    stroke: strokeFor(region),
    strokeWidth: 1,
    onClick: () => onSelectRegion(region),
    role: "button" as const,
    "aria-label": BODY_REGION_LABEL[region],
    style: { cursor: "pointer" as const },
  });

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 220 320"
        width={220}
        height={320}
        role="img"
        aria-label="Mapa de corpo (frente e costas)"
        className="select-none"
      >
        {/* ===== Frente ===== */}
        <text x="55" y="14" fontSize="9" fill="#6b7280" textAnchor="middle">
          Frente
        </text>
        {/* HEAD */}
        <circle cx="55" cy="35" r="14" {...regionProps("HEAD")} />
        {/* NECK */}
        <rect x="49" y="48" width="12" height="8" rx="2" {...regionProps("NECK")} />
        {/* TORSO_FRONT */}
        <path
          d="M30 56 L80 56 L82 130 L28 130 Z"
          {...regionProps("TORSO_FRONT")}
        />
        {/* RIGHT ARM (do personagem; à esquerda do observador) */}
        <path
          d="M20 60 L30 56 L34 120 L24 120 Z"
          {...regionProps("RIGHT_ARM")}
        />
        {/* LEFT ARM */}
        <path
          d="M80 56 L90 60 L86 120 L76 120 Z"
          {...regionProps("LEFT_ARM")}
        />
        {/* RIGHT HAND */}
        <circle cx="29" cy="130" r="7" {...regionProps("RIGHT_HAND")} />
        {/* LEFT HAND */}
        <circle cx="81" cy="130" r="7" {...regionProps("LEFT_HAND")} />
        {/* RIGHT LEG */}
        <path
          d="M30 132 L52 132 L48 230 L34 230 Z"
          {...regionProps("RIGHT_LEG")}
        />
        {/* LEFT LEG */}
        <path
          d="M58 132 L80 132 L76 230 L62 230 Z"
          {...regionProps("LEFT_LEG")}
        />
        {/* RIGHT FOOT */}
        <ellipse cx="41" cy="240" rx="10" ry="6" {...regionProps("RIGHT_FOOT")} />
        {/* LEFT FOOT */}
        <ellipse cx="69" cy="240" rx="10" ry="6" {...regionProps("LEFT_FOOT")} />

        {/* ===== Costas ===== */}
        <text x="165" y="14" fontSize="9" fill="#6b7280" textAnchor="middle">
          Costas
        </text>
        {/* HEAD (mesma região; redesenhada apenas para visual; click usa mesma região) */}
        <circle
          cx="165"
          cy="35"
          r="14"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth={1}
          pointerEvents="none"
        />
        {/* NECK (idem) */}
        <rect
          x="159"
          y="48"
          width="12"
          height="8"
          rx="2"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth={1}
          pointerEvents="none"
        />
        {/* TORSO_BACK */}
        <path
          d="M140 56 L190 56 L192 130 L138 130 Z"
          {...regionProps("TORSO_BACK")}
        />
        {/* Braços, mãos, pernas, pés do back-view ficam só decorativos (regiões compartilhadas com a frente). */}
        <path
          d="M130 60 L140 56 L144 120 L134 120 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M190 56 L200 60 L196 120 L186 120 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <circle
          cx="139"
          cy="130"
          r="7"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <circle
          cx="191"
          cy="130"
          r="7"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M140 132 L162 132 L158 230 L144 230 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <path
          d="M168 132 L190 132 L186 230 L172 230 Z"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <ellipse
          cx="151"
          cy="240"
          rx="10"
          ry="6"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
        <ellipse
          cx="179"
          cy="240"
          rx="10"
          ry="6"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={1}
          pointerEvents="none"
        />
      </svg>
    </div>
  );
}

function NewConditionDialog({
  region,
  onCancel,
  onConfirm,
}: {
  region: BodyRegion | null;
  onCancel: () => void;
  onConfirm: (severity: ConditionSeverity, description: string) => void;
}) {
  const [severity, setSeverity] = useState<ConditionSeverity>("LIGHT");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (region) {
      setSeverity("LIGHT");
      setDescription("");
    }
  }, [region]);

  async function submit() {
    setPending(true);
    try {
      await onConfirm(severity, description);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!region} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Nova condição{region ? ` em ${BODY_REGION_LABEL[region]}` : ""}
          </DialogTitle>
          <DialogDescription>
            Marque um dano ou condição nessa região (ex: corte, queimadura, atordoamento).
          </DialogDescription>
        </DialogHeader>
        <SeverityPicker value={severity} onChange={setSeverity} />
        <div className="space-y-1">
          <Label htmlFor="cond-desc">Descrição (opcional)</Label>
          <Textarea
            id="cond-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: corte profundo, sangrando lentamente"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditConditionDialog({
  condition,
  onCancel,
  onUpdate,
  onDelete,
}: {
  condition: Condition | null;
  onCancel: () => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Condition, "severity" | "description">>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [severity, setSeverity] = useState<ConditionSeverity>("LIGHT");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (condition) {
      setSeverity(condition.severity);
      setDescription(condition.description ?? "");
    }
  }, [condition]);

  async function submit() {
    if (!condition) return;
    setPending(true);
    try {
      await onUpdate(condition.id, { severity, description: description || null });
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!condition) return;
    setPending(true);
    try {
      await onDelete(condition.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!condition} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Editar condição
            {condition ? ` — ${BODY_REGION_LABEL[condition.region]}` : ""}
          </DialogTitle>
        </DialogHeader>
        <SeverityPicker value={severity} onChange={setSeverity} />
        <div className="space-y-1">
          <Label htmlFor="cond-edit-desc">Descrição</Label>
          <Textarea
            id="cond-edit-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DialogFooter className="justify-between">
          <Button variant="destructive" onClick={remove} disabled={pending}>
            <Trash2 className="h-4 w-4" /> Remover
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeverityPicker({
  value,
  onChange,
}: {
  value: ConditionSeverity;
  onChange: (v: ConditionSeverity) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Severidade</Label>
      <div className="grid grid-cols-4 gap-1.5">
        {CONDITION_SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={
              "rounded-md border px-2 py-1.5 text-xs transition-colors " +
              (value === s ? "border-primary bg-primary/10" : "border-input hover:bg-accent")
            }
          >
            <span
              aria-hidden
              className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: SEVERITY_COLOR[s] }}
            />
            {SEVERITY_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
