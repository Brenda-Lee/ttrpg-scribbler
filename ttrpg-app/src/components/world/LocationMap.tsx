"use client";

import { toast } from "sonner";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  MapPin,
  X,
  Loader2,
  User,
  Package,
  ExternalLink,
} from "lucide-react";
import type { LinkedEntity, MapData, Marker } from "@/types/locationMap";

export type { MapData, Marker } from "@/types/locationMap";

type Option = { id: string; name: string };
type Entities = {
  characters: Option[];
  locations: Option[];
  items: Option[];
};

export function LocationMap({
  projectId,
  locationId,
  initialMap,
  baseMeta,
  entities,
}: {
  projectId: string;
  locationId: string;
  initialMap: MapData;
  /** Outros campos do metaJson, preservados ao salvar. */
  baseMeta: Record<string, unknown>;
  entities: Entities;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const [imagePath, setImagePath] = useState<string | undefined>(initialMap.imagePath);
  const [markers, setMarkers] = useState<Marker[]>(initialMap.markers ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");

  async function persist(next: MapData) {
    setSaving(true);
    try {
      const meta = { ...baseMeta, map: next };
      const res = await fetch(`/api/world/${projectId}/location/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaJson: meta }),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar mapa.");
        return false;
      }
      startTransition(() => router.refresh());
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("kind", "map");
      const res = await fetch(`/api/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Falha no upload: ${err.error ?? res.status}`);
        return;
      }
      const data = (await res.json()) as { path: string };
      setImagePath(data.path);
      setMarkers([]); // reset markers on new map
      await persist({ imagePath: data.path, markers: [] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onClickImage(e: React.MouseEvent<HTMLDivElement>) {
    if (!imagePath) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newMarker: Marker = {
      id: crypto.randomUUID(),
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
      label: "",
    };
    const next = [...markers, newMarker];
    setMarkers(next);
    setSelectedId(newMarker.id);
    setLabelDraft("");
    persist({ imagePath, markers: next });
  }

  async function updateMarker(id: string, patch: Partial<Marker>) {
    const next = markers.map((m) => (m.id === id ? { ...m, ...patch } : m));
    setMarkers(next);
    await persist({ imagePath, markers: next });
  }

  async function removeMarker(id: string) {
    const next = markers.filter((m) => m.id !== id);
    setMarkers(next);
    if (selectedId === id) setSelectedId(null);
    await persist({ imagePath, markers: next });
  }

  async function removeImage() {
    setImagePath(undefined);
    setMarkers([]);
    setSelectedId(null);
    await persist({ imagePath: undefined, markers: [] });
  }

  function entityPath(linked: LinkedEntity): string {
    switch (linked.type) {
      case "character":
        return `/projects/${projectId}/characters/${linked.id}`;
      case "location":
        return `/projects/${projectId}/world/locations/${linked.id}`;
      case "item":
        return `/projects/${projectId}/world/items/${linked.id}`;
    }
  }

  function entityOptionsFor(kind: LinkedEntity["type"]): Option[] {
    if (kind === "character") return entities.characters;
    if (kind === "location") return entities.locations;
    return entities.items;
  }

  function entityName(linked: LinkedEntity): string | null {
    const opts = entityOptionsFor(linked.type);
    const found = opts.find((o) => o.id === linked.id);
    return found?.name ?? null;
  }

  const selected = markers.find((m) => m.id === selectedId) ?? null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Mapa
          </h3>
          {imagePath ? (
            <p className="text-xs text-muted-foreground">
              Clique na imagem para adicionar um marcador. Clique em um marcador para editar
              ou abrir a ficha vinculada.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {imagePath ? "Trocar imagem" : "Carregar mapa"}
          </Button>
          {imagePath ? (
            <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
              <X className="h-3.5 w-3.5" /> Remover
            </Button>
          ) : null}
        </div>
      </div>

      {!imagePath ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Sem mapa carregado. Envie uma imagem (PNG/JPG/WEBP, até 5 MB).
        </div>
      ) : (
        <div className="space-y-3">
          <div
            ref={imgWrapRef}
            onClick={onClickImage}
            className="relative w-full overflow-hidden rounded-lg border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt="Mapa do local"
              className="block w-full select-none"
              draggable={false}
            />
            {markers.map((m) => (
              <MarkerButton
                key={m.id}
                marker={m}
                selected={selectedId === m.id}
                onSelect={() => {
                  setSelectedId(m.id);
                  setLabelDraft(m.label);
                }}
              />
            ))}
          </div>

          {selected ? (
            <div className="space-y-3 rounded-lg border bg-card/40 p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="marker-label"
                    className="text-[10px] uppercase tracking-wide text-muted-foreground"
                  >
                    Marcador selecionado
                  </Label>
                  <Input
                    id="marker-label"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onBlur={() => {
                      if (selected.label !== labelDraft) {
                        updateMarker(selected.id, { label: labelDraft });
                      }
                    }}
                    placeholder="Ex: portão norte, taverna do Olho"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMarker(selected.id)}
                  aria-label="Remover marcador"
                  className="text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <LinkedEntityPicker
                selected={selected.linkedEntity}
                entities={entities}
                onChange={(linked) =>
                  updateMarker(selected.id, { linkedEntity: linked ?? undefined })
                }
              />

              {selected.linkedEntity ? (
                <Button
                  asChild
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                >
                  <a href={entityPath(selected.linkedEntity)}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir{" "}
                    {entityName(selected.linkedEntity) ??
                      `${labelForKind(selected.linkedEntity.type)} (vinculado)`}
                  </a>
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {markers.length} marcador{markers.length === 1 ? "" : "es"} no mapa.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function MarkerButton({
  marker,
  selected,
  onSelect,
}: {
  marker: Marker;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = iconForKind(marker.linkedEntity?.type);
  const color = colorForKind(marker.linkedEntity?.type);
  const ariaLabel =
    marker.label ||
    (marker.linkedEntity
      ? `${labelForKind(marker.linkedEntity.type)} vinculado`
      : "Marcador sem rótulo");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={
        "absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-white shadow ring-2 transition-transform hover:scale-110 " +
        color +
        " " +
        (selected ? "h-6 w-6 scale-110" : "h-5 w-5")
      }
      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {Icon ? <Icon className="h-3 w-3 text-white" /> : null}
    </button>
  );
}

function LinkedEntityPicker({
  selected,
  entities,
  onChange,
}: {
  selected: LinkedEntity | undefined;
  entities: Entities;
  onChange: (linked: LinkedEntity | null) => void;
}) {
  const value = selected ? `${selected.type}:${selected.id}` : "";
  const allOptions: Array<{ value: string; label: string; group: string }> = [
    ...entities.characters.map((c) => ({
      value: `character:${c.id}`,
      label: c.name,
      group: "Personagens",
    })),
    ...entities.locations.map((l) => ({
      value: `location:${l.id}`,
      label: l.name,
      group: "Locais",
    })),
    ...entities.items.map((i) => ({
      value: `item:${i.id}`,
      label: i.name,
      group: "Itens",
    })),
  ];
  const grouped = allOptions.reduce<Record<string, typeof allOptions>>((acc, opt) => {
    (acc[opt.group] ??= []).push(opt);
    return acc;
  }, {});

  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Linkar a entidade
      </Label>
      <select
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            onChange(null);
            return;
          }
          const [type, id] = raw.split(":");
          if (
            (type === "character" || type === "location" || type === "item") &&
            typeof id === "string" &&
            id.length > 0
          ) {
            onChange({ type, id });
          }
        }}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">— sem vínculo</option>
        {Object.entries(grouped).map(([group, options]) => (
          <optgroup key={group} label={group}>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function iconForKind(kind: LinkedEntity["type"] | undefined) {
  if (kind === "character") return User;
  if (kind === "item") return Package;
  if (kind === "location") return MapPin;
  return null;
}

function colorForKind(kind: LinkedEntity["type"] | undefined): string {
  if (kind === "character") return "bg-sky-500 ring-sky-500/40";
  if (kind === "item") return "bg-violet-500 ring-violet-500/40";
  if (kind === "location") return "bg-emerald-500 ring-emerald-500/40";
  return "bg-amber-500 ring-amber-500/40";
}

function labelForKind(kind: LinkedEntity["type"]): string {
  if (kind === "character") return "personagem";
  if (kind === "location") return "local";
  return "item";
}
