## Problem

On the trip builder, the floating "Day 1 / Day 2" tab switcher sits at the top-left of the map (`left-4 top-4`), where Google Maps also renders its Map/Satellite type toggle. The two controls collide.

## Fix

In `src/routes/trip.$tripId.tsx` (around lines 104-119), move the Day tabs out of Google's default control zones:

- Change the wrapper from `absolute left-4 top-4` to `absolute bottom-4 left-1/2 -translate-x-1/2` so the tabs float along the bottom-center of the map, clear of the Map/Satellite toggle (top-left), zoom/pegman (bottom-right), and fullscreen (top-right) controls.
- Keep the existing `bg-background/95 shadow-md backdrop-blur` styling so it stays readable over the map.

No other files or behavior change.