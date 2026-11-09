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
- Inventory admin at `admin.html` for stock, prices, product images and restock alerts
- Separate Seller portal (`admin.html`) and Super admin portal (`super-admin.html`)
- Sellers can view inventory, record daily sales, and confirm WhatsApp orders; all sale times are automatic
- Super admins can appoint Sellers or Inventory staff, review access and activity, and manage products
- Inventory staff can edit product details and adjust stock; every addition and deduction is logged with the staff member and time
- Super admins can review staff login/logout times and inventory changes in the Inventory activity tab
- Day, week and month sales summaries with clear deducted/pending stock status
- Customer catalog reflects admin inventory updates and displays out-of-stock badges
- One-tap **Order via WhatsApp** that pre-fills the full order list
- Contact page with location, hours, form and WhatsApp CTA
- Professional navy + amber color scheme suitable for auto parts

## How to view

Open `index.html` in any modern browser (or serve the folder with any static server).

```bash
# Example
cd tinex-store
python3 -m http.server 8080
# then visit http://localhost:8080 or http://localhost:8080/admin.html
```

Inventory, staff accounts, sales, sign-in sessions, and inventory activity are stored in the browser's localStorage and shared between pages opened from the same site origin. Sellers use `admin.html`; Super admins use `super-admin.html`. The Super admin can create Seller or Inventory staff accounts, revoke or restore their access, manage products and stock, and review sales and the Inventory activity tab. Sellers can view inventory, record item sales, and confirm completed WhatsApp orders; both actions deduct stock immediately and automatically record the current time. Inventory staff can edit product details and add or deduct stock; each change records the acting staff member, action, changed values, and time. The Super admin can review user login/logout times and inventory changes in the Inventory activity tab. Logout time is recorded when the user selects Sign out. Do not record the same sale twice. The included demo Seller login is username `seller` and password `seller-demo`. Regular `wa.me` links cannot notify the site when a message is sent or confirmed. This is a static demo: account passwords and permissions are stored client-side and can be inspected or bypassed, and data is not synchronized to other devices. Use server-side authentication and a database before publishing for business use.

The demo passwords are stored separately in `js/super-admin-auth.js` and `js/seller-auth.js`. They are for local testing only, not for protecting a live store.

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
├── admin.html          # Seller portal
├── super-admin.html    # Separate Super admin portal
├── css/styles.css      # All styles
├── js/store.js         # Products data, cart, WhatsApp logic
├── js/admin.js         # Shared inventory and sales dashboard
├── js/seller-auth.js   # Seller demo login
├── js/super-admin-auth.js # Super admin demo login
└── README.md
```

All product images and the hero photo/video are intentionally left as **placeholder cards** so you can drop in real assets later.
