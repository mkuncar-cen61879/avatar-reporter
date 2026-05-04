Moje vize:
- vložím ti soubor v CSV formátu
- konvertuješ ho do JSON
- vytvoříš z JSON report/dashboard dle instrukcí níže:

Build a single-file Performance Dashboard in HTML/CSS/JS using Plotly.js 2.35.2 and Poppins (Google Fonts, weights 400–800).
Theme: Background #f0f4f8, white cards, border #e2e8f0, radius 16px, soft shadow, hover lift. Palette: blue #2563eb, teal #0891b2, green #059669, amber #d97706, violet #7c3aed, rose #e11d48 — each with a light tint bg.
Header: Centered. Pill eyebrow → Poppins 800 title with "Performance" in blue → subtitle → 60px blue-to-teal gradient divider.
Upload screen: Dashed-border white card, turns blue on hover/drag, with icon, heading, description, and a blue file-picker button. Parses JSON array (Order ID, Order Date MM/DD/YYYY, Sales, Profit, Quantity, Segment, State, Product Name, Ship Mode).
Dashboard (post-upload): Live-dot record count pill + reset button. Then:
4 KPI cards (4-col grid): colored left border + icon + 800-weight 30px value. Blue=Revenue, Teal=Profit, Green=Units, Amber=AOV.
Row 1 (2-col): Spline area line chart (Sales=blue, Profit=green) + Segment donut (hole 0.58).
Row 2 (2-col): US choropleth (blue scale) + Top 10 Products horizontal bar (blue→teal gradient, reversed axis).
Row 3 (3-col): Three Ship Mode donuts — Profit Share, Volume Share, Order Count — same color-per-mode across all three.
All Plotly charts: transparent bg, #e2e8f0 grid, Poppins font, no modebar. Staggered fadeUp animations on load.
