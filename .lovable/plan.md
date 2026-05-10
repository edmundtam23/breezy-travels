## Fix: Done button on stop editor popover doesn't close it

### Problem
In `src/routes/trip.$tripId.tsx`, the `EditPopover` component (line 548) uses an uncontrolled `<Popover>`. The "Done" button at the bottom (line 618–627) saves the changes and shows a toast, but never tells the popover to close — so it stays open until the user clicks outside.

### Change
Make the popover controlled and close it when "Done" is clicked.

1. In `EditPopover`, add local state: `const [open, setOpen] = useState(false);`
2. Change `<Popover>` → `<Popover open={open} onOpenChange={setOpen}>`.
3. In the "Done" button's `onClick`, after `onChange(...)` and `toast.success("Saved")`, call `setOpen(false)`.

### Out of scope
- The time-picker's own "Done" button already closes its popover correctly — no change there.
- No styling, data, or other behavior changes.
