## Fix: Done button on stop editor popover still doesn't close it

### What's happening
`EditPopover` already calls `setOpen(false)` inside the Done button's `onClick` (line 625 of `src/routes/trip.$tripId.tsx`), but the popover stays open. The likely cause: `onChange(...)` is invoked first and bubbles up to the parent, which updates trip state and re-renders the stop list. Depending on how that update settles, the controlled `open` state on the local `Popover` can get out of sync, so the close call doesn't visibly take effect — exactly the symptom the user is reporting. The chevron-arrow trigger works because it just toggles Radix's own state with no surrounding state churn.

### Fix
Use Radix's built-in close primitive instead of relying on our local `open` state during a render storm. This guarantees Done behaves identically to clicking the chevron arrow (the circled control in the screenshot).

1. In `src/components/ui/popover.tsx`, also export `PopoverClose` (re-export `PopoverPrimitive.Close`).
2. In `src/routes/trip.$tripId.tsx`:
   - Import `PopoverClose` alongside the other popover imports.
   - Wrap the Done `<Button>` with `<PopoverClose asChild>…</PopoverClose>`.
   - Reorder the Done `onClick` so `setOpen(false)` runs first as a belt-and-braces fallback, then `onChange(...)` and `toast.success("Saved")`. Keep the existing `setOpen` controlled state — `PopoverClose` works with both controlled and uncontrolled popovers.

### Out of scope
- The `TimePicker`'s own Done button — already closes correctly.
- Any styling, validation, save behavior, or toast changes.
