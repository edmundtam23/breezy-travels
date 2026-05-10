import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // "HH:MM" 24h
  onChange: (v: string) => void;
};

const ITEM_H = 32; // px per row
const VISIBLE = 5; // visible rows; selected sits at center (index 2)

function parse(value: string) {
  const [hStr, mStr] = (value || "00:00").split(":");
  const h24 = Math.max(0, Math.min(23, parseInt(hStr, 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return { h12, m, period };
}

function format24(h12: number, m: number, period: "AM" | "PM") {
  let h = h12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDisplay(value: string) {
  const { h12, m, period } = parse(value);
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function Wheel<T extends string | number>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = items.indexOf(value);
  const scrollTimer = useRef<number | null>(null);

  // Sync scroll to selected value when it changes externally
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = Math.max(0, idx) * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [idx]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const i = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, i));
      const next = items[clamped];
      if (next !== value) onChange(next);
      // snap precisely
      const target = clamped * ITEM_H;
      if (Math.abs(el.scrollTop - target) > 0.5) {
        el.scrollTo({ top: target, behavior: "smooth" });
      }
    }, 90);
  };

  const pad = (VISIBLE - 1) / 2;

  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      ref={ref}
      onScroll={onScroll}
      className="relative h-[160px] flex-1 overflow-y-auto no-scrollbar snap-y snap-mandatory"
      style={{ scrollSnapType: "y mandatory" }}
    >
      <div style={{ height: pad * ITEM_H }} />
      {items.map((it, i) => {
        const selected = i === idx;
        return (
          <button
            type="button"
            key={String(it)}
            onClick={() => onChange(it)}
            className={cn(
              "flex w-full items-center justify-center text-sm snap-center transition-colors",
              selected ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
          >
            {typeof it === "number" ? String(it).padStart(2, "0") : it}
          </button>
        );
      })}
      <div style={{ height: pad * ITEM_H }} />
    </div>
  );
}

export function TimePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => parse(value), [value]);
  const [h12, setH12] = useState(initial.h12);
  const [m, setM] = useState(initial.m);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);

  // Re-sync when popover opens or external value changes
  useEffect(() => {
    if (open) {
      const p = parse(value);
      setH12(p.h12);
      setM(p.m);
      setPeriod(p.period);
    }
  }, [open, value]);

  const commit = (nh: number, nm: number, np: "AM" | "PM") => {
    onChange(format24(nh, nm, np));
  };

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent text-sm font-medium text-foreground focus:outline-none tabular-nums"
        >
          {formatDisplay(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[220px] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex gap-1">
          {/* Center selection pill */}
          <div
            className="pointer-events-none absolute left-1 right-1 rounded-md bg-muted ring-1 ring-border"
            style={{ top: ((VISIBLE - 1) / 2) * ITEM_H, height: ITEM_H }}
          />
          <Wheel
            items={hours}
            value={h12}
            onChange={(v) => {
              setH12(v);
              commit(v, m, period);
            }}
            ariaLabel="Hours"
          />
          <Wheel
            items={minutes}
            value={m}
            onChange={(v) => {
              setM(v);
              commit(h12, v, period);
            }}
            ariaLabel="Minutes"
          />
          <Wheel
            items={["AM", "PM"] as const as ("AM" | "PM")[]}
            value={period}
            onChange={(v) => {
              setPeriod(v);
              commit(h12, m, v);
            }}
            ariaLabel="AM or PM"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
