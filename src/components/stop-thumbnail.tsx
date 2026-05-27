// src/components/stop-thumbnail.tsx
//
// Reusable stop card thumbnail used by both demo-trip.tsx and the real trip
// card component. Shows a category emoji on a navy-tinted background with a
// numbered badge in the top-left corner.
//
// Props:
//   category  — raw category string from the stop object (e.g. "food")
//   index     — 0-based stop index within the day; displayed as index + 1
//
// Thumbnail background:  blue-100 (light) / blue-900 (dark)
// Badge background:      #1e3a8a (blue-900) in both modes
// Badge text:            #dbeafe (blue-100) in both modes
//
// The badge colors are intentionally fixed (not Tailwind dark: variants)
// because the navy/light-blue pairing works equally well on both backgrounds.

import { getCategoryEmoji } from "@/lib/stop-icons";

interface StopThumbnailProps {
  category: string | undefined | null;
  index: number;
}

export function StopThumbnail({ category, index }: StopThumbnailProps) {
  return (
    <div className="relative w-[42px] h-[42px] shrink-0 rounded-[10px] flex items-center justify-center text-xl bg-blue-100 dark:bg-blue-900">
      <span
        className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-medium"
        style={{ background: "#1e3a8a", color: "#dbeafe" }}
      >
        {index + 1}
      </span>
      {getCategoryEmoji(category)}
    </div>
  );
}