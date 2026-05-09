## Plan

Move the Google Maps `Map / Satellite` control away from the top-left Day tabs instead of moving the Day tabs.

### Changes

1. Update `src/components/map-panel.tsx` so the Google Maps map type control renders in the bottom-left corner.
2. Keep the Day tabs in their current top-left position if needed by reverting their wrapper in `src/routes/trip.$tripId.tsx` from bottom-center back to top-left.
3. Leave zoom, Street View, fullscreen, markers, drag-and-drop, and itinerary behavior unchanged.

### Technical details

- Use the Google Maps option `mapTypeControlOptions.position = ControlPosition.LEFT_BOTTOM` on the `<Map />` component.
- Import/use `ControlPosition` through `@vis.gl/react-google-maps` if available, or via the loaded Maps API if needed.
- This targets the native Google Maps control directly, so it should not depend on CSS layering or z-index workarounds.