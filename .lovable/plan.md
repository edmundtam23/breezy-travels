# Custom time picker for consistent UI

## Why
The current `TimeInput` in `src/routes/trip.$tripId.tsx` uses a native `<input type="time">`. Each browser renders its own UI:
- Safari/macOS → clean scrolling wheels (the look you prefer)
- Chrome/Edge → boxed AM/PM grid
- Firefox → another variant
- iOS/Android → their own native pickers

The only way to guarantee the same look everywhere is to stop using the native control and render our own picker.

## What to build

1. **New component** `src/components/time-picker.tsx`
   - Trigger: a button styled like the current time text (so the stop card looks unchanged when closed).
   - Popover content: three vertically-scrollable columns — Hours (1–12), Minutes (00–59), AM/PM — mimicking the macOS wheel style shown in the preferred screenshot.
   - Selected row highlighted with a soft pill (using existing semantic tokens — `bg-muted`, `text-foreground`, `ring-1 ring-border`). No hard-coded colors.
   - Snap scrolling (`scroll-snap-type: y mandatory`) so values lock into place as the user scrolls/drags.
   - Click a value to select it; "Done" / "Reset" buttons at the bottom (mirrors the macOS picker).
   - Keyboard accessible: Up/Down to change focused column, Enter to confirm, Esc to close.
   - Value contract identical to the current input: accepts and emits `"HH:MM"` 24-hour strings, so no other code needs to change.

2. **Swap the usage** in `src/routes/trip.$tripId.tsx`
   - Replace the `TimeInput` implementation (lines ~470–479) with the new `TimePicker`.
   - Keep the surrounding clock icon and `· {durationMin}m` markup unchanged.

3. **Styling**
   - Use Tailwind + existing shadcn `Popover` for the dropdown shell (already imported in the file).
   - All colors via design tokens defined in `src/styles.css`. No raw color classes.
   - Width ~ 220px, height ~ 220px, three equal columns, rounded-lg, subtle border + shadow.

4. **No backend or data-model changes** — purely a presentation swap. Storage still holds `"HH:MM"` per `Stop.time` in `src/lib/types.ts`.

## Out of scope
- Date pickers elsewhere in the app.
- Changing the underlying time format or storage.
- Mobile-specific native sheet behavior (the custom picker will be used on mobile too for consistency).

## Notes for the user
This is a real UI tradeoff: native time inputs come with free accessibility and OS-level conveniences (e.g., keyboard shortcuts, OS time format). A custom picker gives consistency but we own the a11y and edge cases. If you'd rather keep the native input and only tighten its appearance, an alternative is to leave it as-is and accept per-browser differences — let me know which direction you prefer before I implement.
