# Konda Store — Store Management & Billing System

A complete, offline-first Store Management & Billing System built with
**plain HTML, CSS and Vanilla JavaScript**. No frameworks, no backend,
no build step. All data is stored in the browser's `localStorage`.

---

## 1. Getting started

There is no build step and no server required.

1. Download / clone this folder.
2. Open `index.html` directly in a browser, **or** serve the folder
   with any static file server (recommended for the best experience):

   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```
3. Log in with one of the demo accounts below.

This project is also directly uploadable to **GitHub Pages** — just
push the `Store/` folder contents to a repo and enable Pages on the
`main` branch (root).

---

## 2. Demo credentials

| Role  | Username | Password |
|-------|----------|----------|
| Owner | `owner`  | `1234`   |
| Staff | `staff`  | `1234`   |

Sessions persist in `localStorage` until you click **Logout**, so
refreshing the page will not log you out.

---

## 3. Folder structure

```
Store/
├── index.html          Login page (Owner / Staff)
├── owner.html           Owner dashboard shell
├── staff.html            Staff billing shell
│
├── css/
│   └── style.css         Full design system + layout + print styles
│
├── js/
│   ├── storage.js         LocalStorage data layer ("database")
│   ├── login.js           Auth, session, route guards, logout
│   ├── products.js        Product CRUD + catalogue rendering
│   ├── billing.js         Cart, bill generation, print, WhatsApp
│   ├── owner.js            Dashboard cards, sales history, settings
│   └── staff.js             Staff route guard + navigation
│
├── assets/
│   └── logo.png            App logo
│
└── README.md
```

---

## 4. Features

### Login
- Separate Owner / Staff login with role tabs.
- Session stored in `localStorage` (`ks_session`) — survives refresh.
- Route guards (`requireRole`) redirect unauthorized users back to
  the login page automatically.
- Logout button on both dashboards clears the session.

### Owner Dashboard
- **Stat cards**: Today's Sales, Today's Bills, Products Count,
  Total Revenue (plus Today's Revenue).
- **Product Management**: add, edit, delete, and instantly search
  products. Stock can be adjusted inline with +/- controls.
- **Sales & Bills**: full bill history with instant search
  (by bill number, customer name or phone) and delete.
- **Settings**: edit store name & tagline, used across the app and
  in the WhatsApp bill message.

### Staff Dashboard
- Staff can **only** access Billing — no product management or
  settings are reachable (enforced both in the UI and in the route
  guard).
- **Product Catalogue**: card grid with instant search, "+ Add"
  button per product, out-of-stock products are disabled.
- **Billing**: customer name/phone, live cart with quantity
  +/- controls and remove, subtotal & grand total, auto bill number.
- **Generate Bill** → renders a printable **receipt-style** bill.
- **Print Bill** → uses the browser's native print dialog
  (print stylesheet isolates just the receipt).
- **Send WhatsApp** → builds a formatted text message and opens
  `https://wa.me/<phone>?text=<message>` in a new tab.

### Validation
- No duplicate product names (case-insensitive).
- Price must be a number greater than 0.
- Stock must be 0 or a positive integer.
- Customer name and phone are required; phone must be 10–13 digits.
- Quantities in the cart can never go below 1 (removing at 0),
  and can't exceed available stock.
- Empty-state screens for products, catalogue, cart, sales and
  recent bills.

### Data & storage
Everything lives in `localStorage` under these keys:

| Key | Contents |
|-----|----------|
| `ks_products` | Array of products (seeded with 6 sample items on first run) |
| `ks_bills` | Array of generated bills (newest first) |
| `ks_session` | Current logged-in `{ role, username, loginTime }` |
| `ks_settings` | Store name, tagline, currency symbol |
| `ks_bill_seq` | Internal counter used to generate bill numbers |

Selling an item automatically deducts it from stock; deleting a bill
does **not** restore stock (matching real-world billing behavior,
since the sale already happened).

---

## 5. Design

- **Theme**: dark "ink navy" surfaces with a brass/gold accent
  (evokes cash & receipts) and a teal secondary for positive states.
- **Typography**: Sora (display headings), Inter (body/UI),
  JetBrains Mono (prices, bill numbers, and the receipt itself).
- **Signature element**: the generated bill is styled as a physical
  paper receipt, complete with a torn/serrated bottom edge, dashed
  dividers and monospaced figures.
- Fully responsive: sidebar collapses to a slide-in drawer on mobile,
  stat/catalogue grids reflow, and the billing layout stacks
  vertically on small screens.

---

## 6. Notes

- This is a front-end-only demo system: all "authentication" is a
  hardcoded credential check for demonstration purposes and is not
  secure for real production use with sensitive data.
- Clearing your browser's site data / localStorage will reset the
  app back to its seeded sample products with no bills.
