## Add favicon

1. Copy `user-uploads://ChatGPT_Image_May_7_2026_11_59_08_PM.png` to `public/favicon.png`.
2. In `src/routes/__root.tsx`, add a favicon link to the root route's `head().links` array:
   ```
   { rel: "icon", type: "image/png", href: "/favicon.png" }
   ```

That's it — TanStack Start serves files from `public/` at the site root, so the browser will pick up the new icon on next load.

### Out of scope
- Generating multi-size icons (16/32/180 apple-touch). Can add later if desired.
- Replacing any other branding/logo usage in the app.
