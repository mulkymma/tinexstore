# TINEX AUTO COMPONENTS — Professional Store Mockup

A clean, professional static website redesign of the TINEX Auto Components Shopify store (originally at `1qa3kt-1q.myshopify.com`).

## What was improved

| Original issue | Fix applied |
|---------------|-------------|
| Spelling “COMPONANTS” | Corrected to **COMPONENTS** everywhere |
| Catalog menu linked to contact | Proper Catalog page + brand filters |
| Weak meta description | Clear SEO title + description naming brands, parts & Kenya |
| Vague location “Tiktak Near bibla” | Expanded to Near Tik Tak, Majengo / Tononoka, Mombasa + hours + phone |
| Empty “Coming soon” blocks | Removed |
| myshopify.com only | Designed as ready for custom domain |
| Part codes only in titles | Dedicated part-number field + search by code |
| Image handling | Clear **placeholder cards** everywhere images would appear |

## Features

- Responsive, mobile-first design
- Product catalog with Bajaj / Piaggio filters
- Search by title or part number
- Cart with localStorage persistence
- One-tap **Order via WhatsApp** that pre-fills the full order list
- Contact page with location, hours, form and WhatsApp CTA
- Professional navy + amber color scheme suitable for auto parts

## How to view

Open `index.html` in any modern browser (or serve the folder with any static server).

```bash
# Example
cd tinex-store
python3 -m http.server 8080
# then visit http://localhost:8080
```

## WhatsApp number used

`254759417020` (0759 417 020) — the number to use for ordering parts.

## Next steps to go live on Shopify

1. Create a Shopify store, set currency to KSh / Kenya.
2. Import the product list (titles, part numbers as SKUs or metafields, prices, stock).
3. Use a free theme (Dawn or similar) and rebuild the homepage sections to match this layout.
4. Add a custom “Order via WhatsApp” button in the cart (many free apps or a simple liquid snippet with `wa.me` link).
5. Connect a custom domain (e.g. tinexautocomponents.co.ke).
6. Replace every “Image Placeholder” with real product photos.
7. Embed a Google Map on the contact / location section.

## File structure

```
tinex-store/
├── index.html          # Homepage
├── catalog.html        # Full product catalog + filters
├── contact.html        # Location, hours, contact form
├── css/styles.css      # All styles
├── js/store.js         # Products data, cart, WhatsApp logic
└── README.md
```

All product images and the hero photo/video are intentionally left as **placeholder cards** so you can drop in real assets later.
