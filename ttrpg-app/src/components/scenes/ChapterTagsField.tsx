"use client";

import { toast } from "sonner";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, User, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

type CharacterOption = { id: string; name: string };
type TagOption = { id: string; name: string; color: string };

export function ChapterTagsField({
  chapterId,
  allCharacters,
  selectedCharacterIds,
  allTags,
  selectedTagNames,
}: {
  chapterId: string;
  allCharacters: CharacterOption[];
  selectedCharacterIds: string[];
  allTags: TagOption[];
  selectedTagNames: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedCharSet = useMemo(
    () => new Set(selectedCharacterIds),
    [selectedCharacterIds],
  );
  const selectedTagSet = useMemo(
    () => new Set(selectedTagNames.map((n) => n.toLowerCase())),
    [selectedTagNames],
  );

  const selectedCharacters = allCharacters.filter((c) => selectedCharSet.has(c.id));

  async function sync(opts: { characterIds?: string[]; tagNames?: string[] }) {
    setPending(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      if (!res.ok) {
        toast.error("Erro ao atualizar.");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  function toggleCharacter(id: string) {
    const next = new Set(selectedCharacterIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    sync({ characterIds: Array.from(next) });
  }

  function toggleTag(name: string) {
    const lower = name.toLowerCase();
    const next = selectedTagNames.filter((n) => n.toLowerCase() !== lower);
    if (next.length === selectedTagNames.length) next.push(name);
    sync({ tagNames: next });
  }

  function addNewTag() {
    const name = query.trim();
    if (!name) return;
    if (selectedTagSet.has(name.toLowerCase())) {
      setQuery("");
      return;
    }
    sync({ tagNames: [...selectedTagNames, name] });
    setQuery("");
  }

  const q = query.trim().toLowerCase();
  const filteredCharacters = allCharacters.filter(
    (c) => !q || c.name.toLowerCase().includes(q),
  );
  const filteredTags = allTags.filter((t) => !q || t.name.toLowerCase().includes(q));
  const showCreateTag =
    q.length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === q) &&
    !selectedTagSet.has(q);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {selectedCharacters.map((c) => (
        <Chip
          key={`c-${c.id}`}
          icon={User}
          label={c.name}
          variant="character"
          onRemove={() => toggleCharacter(c.id)}
          disabled={pending}
        />
      ))}
      {selectedTagNames.map((name) => {
        const tag = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
        return (
          <Chip
            key={`t-${name}`}
            icon={Hash}
            label={name}
            color={tag?.color}
            variant="tag"
            onRemove={() => toggleTag(name)}
            disabled={pending}
          />
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs text-muted-foreground"
            disabled={pending}
          >
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ou criar tag..."
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreateTag) addNewTag();
            }}
          />
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {filteredCharacters.length > 0 ? (
              <Section title="Personagens">
                {filteredCharacters.map((c) => (
                  <OptionRow
                    key={c.id}
                    icon={User}
                    label={c.name}
                    selected={selectedCharSet.has(c.id)}
                    onClick={() => toggleCharacter(c.id)}
                  />
                ))}
              </Section>
            ) : null}

            {filteredTags.length > 0 ? (
              <Section title="Tags do projeto">
                {filteredTags.map((t) => (
                  <OptionRow
                    key={t.id}
                    icon={Hash}
                    label={t.name}
                    color={t.color}
                    selected={selectedTagSet.has(t.name.toLowerCase())}
                    onClick={() => toggleTag(t.name)}
                  />
                ))}
              </Section>
            ) : null}

            {showCreateTag ? (
              <button
                type="button"
                onClick={addNewTag}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                <Plus className="h-3 w-3" />
                Criar tag{" "}
                <span className="font-mono font-semibold">#{query.trim()}</span>
              </button>
            ) : null}

            {filteredCharacters.length === 0 &&
            filteredTags.length === 0 &&
            !showCreateTag ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">Nada encontrado.</p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Chip({
  icon: Icon,
  label,
  color,
  variant,
  onRemove,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color?: string;
  variant: "character" | "tag";
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        variant === "character"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-input bg-secondary text-secondary-foreground",
      )}
      style={
        variant === "tag" && color
          ? { borderColor: `${color}66`, backgroundColor: `${color}1f`, color: undefined }
          : undefined
      }
    >
      <Icon className="h-3 w-3" />
      {label}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remover ${label}`}
        className="opacity-60 hover:opacity-100 disabled:opacity-30"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function OptionRow({
  icon: Icon,
  label,
  color,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  color?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
        selected && "bg-accent",
      )}
    >
      <Icon className="h-3 w-3 shrink-0" style={color ? { color } : undefined} />
      <span className="flex-1 truncate">{label}</span>
      {selected ? <span className="text-[10px] text-muted-foreground">✓</span> : null}
    </button>
  );
}
