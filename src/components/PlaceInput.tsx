import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupPlaces, type Place } from "@/lib/geo";
import { Loader2 } from "lucide-react";

type Props = {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  placeholder?: string;
};

export function PlaceInput({ label, value, onChange, placeholder }: Props) {
  const [text, setText] = useState(value?.label ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.label]);

  function search(next: string) {
    setText(next);
    onChange(null);
    if (timer.current) clearTimeout(timer.current);
    if (next.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    setBusy(true);
    timer.current = setTimeout(async () => {
      try {
        const found = await lookupPlaces(next);
        setResults(found);
        setOpen(true);
      } finally {
        setBusy(false);
      }
    }, 450);
  }

  return (
    <div className="relative space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={text}
          placeholder={placeholder ?? "Type an address or sector"}
          onChange={(e) => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {busy && (
          <Loader2 className="absolute right-2 top-2.5 size-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng},${r.label}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange(r);
                  setText(r.label);
                  setOpen(false);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!value && text.trim().length >= 3 && !busy && !open && (
        <p className="text-xs text-muted-foreground">Pick a suggestion to set the location.</p>
      )}
    </div>
  );
}
