import type { Trip, Stop } from "./types";

// ---------------------------------------------------------------------------
// Self-contained HTML export of a trip. The generated document has no external
// dependencies (inline CSS, system font stacks) so it renders offline and can
// be forwarded as a plain file. Design language borrowed from Edmund's
// Hong Kong itinerary reference: editorial masthead, day sections, stop cards
// with category color-coding, dark-mode aware.
// ---------------------------------------------------------------------------

function esc(value: string | null | undefined): string {
  return (value ?? "").replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#B7362A",
  restaurant: "#B7362A",
  sights: "#2A6480",
  landmark: "#2A6480",
  museum: "#2A6480",
  outdoors: "#37705A",
  park: "#37705A",
  nature: "#37705A",
  culture: "#8A5A12",
  art: "#8A5A12",
  shopping: "#6B4E9B",
};

function categoryColor(category: string | undefined): string {
  if (!category) return "#78878C";
  const key = category.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "#78878C";
}

function formatTime(time: string | undefined): string {
  return time ?? "";
}

function stopCard(stop: Stop, nextMode: string | undefined): string {
  const color = categoryColor(stop.category);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`;
  return `
    <article class="stop">
      <div class="stop-time">
        <span class="time">${esc(formatTime(stop.time))}</span>
        ${stop.durationMin ? `<span class="dur">${stop.durationMin} min</span>` : ""}
      </div>
      <div class="stop-body">
        <div class="stop-head">
          <span class="cat" style="--cat:${color}"></span>
          <h3>${esc(stop.name)}</h3>
        </div>
        ${stop.address ? `<p class="addr">${esc(stop.address)}</p>` : ""}
        ${stop.blurb ? `<p>${esc(stop.blurb)}</p>` : ""}
        ${stop.visitTip ? `<p class="tip"><strong>Tip:</strong> ${esc(stop.visitTip)}</p>` : ""}
        <p class="meta-row">
          <a href="${mapsUrl}" target="_blank" rel="noopener">Open in Google Maps</a>
          ${stop.category ? `<span class="cat-label">${esc(stop.category)}</span>` : ""}
        </p>
      </div>
    </article>
    ${
      nextMode
        ? `<div class="transit">→ continue by ${esc(nextMode.toLowerCase())}</div>`
        : ""
    }`;
}

export function exportTripHtml(trip: Trip): string {
  const totalStops = trip.days.reduce((n, d) => n + d.stops.length, 0);
  const generated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const daysHtml = trip.days
    .map((day, i) => {
      const stopsHtml = day.stops
        .map((s, si) =>
          stopCard(s, si < day.stops.length - 1 ? s.travelModeToNext : undefined)
        )
        .join("\n");
      return `
      <section class="day">
        <p class="eyebrow">Day ${i + 1}</p>
        <h2>${esc(day.title)}</h2>
        ${day.summary ? `<p class="standfirst">${esc(day.summary)}</p>` : ""}
        ${stopsHtml || `<p class="muted">No stops planned for this day yet.</p>`}
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(trip.title)} — Breezy Plans</title>
<style>
:root{
  --paper:#F7F5F0; --surface:#FFFFFF; --ink:#1A1E1C; --ink-soft:#3C4A50;
  --muted:#6B7A80; --rule:#DAD5C9; --rule-soft:#EAE6DB;
  --shadow:0 1px 2px rgba(26,30,28,.06), 0 8px 20px -14px rgba(26,30,28,.25);
}
@media (prefers-color-scheme: dark){
  :root{
    --paper:#101415; --surface:#181D1E; --ink:#E8ECEA; --ink-soft:#BCC8C7;
    --muted:#8C9C9E; --rule:#2B3534; --rule-soft:#222A29;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 22px -14px rgba(0,0,0,.7);
  }
}
*{box-sizing:border-box;}
body{background:var(--paper);color:var(--ink);
  font-family:Georgia,"Times New Roman",serif;font-size:16.5px;line-height:1.6;
  -webkit-font-smoothing:antialiased;margin:0;}
.wrap{max-width:720px;margin:0 auto;padding:0 20px 80px;}
.mast{padding:44px 0 26px;border-bottom:2px solid var(--ink);}
.eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;
  font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
  margin:0 0 12px;}
h1{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  font-weight:800;font-size:clamp(34px,8vw,54px);line-height:1;letter-spacing:-.02em;
  margin:0 0 12px;}
.standfirst{font-size:17px;color:var(--ink-soft);margin:0;max-width:58ch;}
.facts{display:flex;flex-wrap:wrap;gap:8px 28px;border-bottom:1px solid var(--rule);
  padding:16px 0;}
.fact{font-size:13.5px;color:var(--muted);}
.fact b{color:var(--ink);font-weight:600;}
.day{padding:34px 0 8px;border-bottom:1px solid var(--rule);}
.day:last-of-type{border-bottom:none;}
.day h2{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-.01em;}
.stop{display:grid;grid-template-columns:76px 1fr;gap:14px;background:var(--surface);
  border:1px solid var(--rule-soft);border-radius:12px;padding:16px;margin:14px 0;
  box-shadow:var(--shadow);}
.stop-time{display:flex;flex-direction:column;gap:2px;}
.time{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;font-weight:600;}
.dur{font-size:12px;color:var(--muted);}
.stop-head{display:flex;align-items:baseline;gap:8px;}
.stop-head h3{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  font-size:17px;font-weight:700;margin:0;}
.cat{width:9px;height:9px;border-radius:50%;background:var(--cat,#78878C);flex:none;
  transform:translateY(-1px);}
.addr{font-size:13.5px;color:var(--muted);margin:2px 0 8px;}
.stop p{margin:6px 0;}
.tip{background:var(--rule-soft);border-radius:8px;padding:8px 12px;font-size:14.5px;}
.meta-row{display:flex;align-items:center;gap:12px;font-size:13.5px;margin-top:10px;}
.meta-row a{color:inherit;}
.cat-label{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);
  border:1px solid var(--rule);border-radius:999px;padding:2px 10px;}
.transit{font-size:13px;color:var(--muted);padding:2px 0 2px 90px;}
.muted{color:var(--muted);}
footer{margin-top:48px;padding-top:18px;border-top:1px solid var(--rule);
  font-size:13px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;}
@media (max-width:560px){ .stop{grid-template-columns:1fr;} .transit{padding-left:0;} }
@media print{ body{background:#fff;} .stop{box-shadow:none;break-inside:avoid;} }
</style>
</head>
<body>
<div class="wrap">
  <header class="mast">
    <p class="eyebrow">Breezy Plans · Shared itinerary</p>
    <h1>${esc(trip.title)}</h1>
    <p class="standfirst">${esc(trip.destination)}</p>
  </header>
  <div class="facts">
    <span class="fact"><b>${trip.days.length}</b> day${trip.days.length === 1 ? "" : "s"}</span>
    <span class="fact"><b>${totalStops}</b> stop${totalStops === 1 ? "" : "s"}</span>
    <span class="fact">Exported <b>${esc(generated)}</b></span>
  </div>
  ${daysHtml}
  <footer>
    <span>Planned with Breezy Plans</span>
    <span>Times are local to the destination</span>
  </footer>
</div>
</body>
</html>`;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "trip"
  );
}

export function downloadTripHtml(trip: Trip): void {
  const blob = new Blob([exportTripHtml(trip)], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(trip.title)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
