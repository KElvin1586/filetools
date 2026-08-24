# FileTools Pricing

FileTools is a **Free + Premium** product. Premium is a **one-time payment** — no
subscriptions, no accounts, no trials that silently convert.

| | **Free** | **Premium** |
| --- | --- | --- |
| Price | $0 | **$9.99 one-time** (configurable) |
| Single-file processing | ✓ | ✓ |
| Resize (percentage & fit) | ✓ | ✓ |
| Basic compression presets | ✓ | ✓ |
| JPG / PNG / WebP conversion | ✓ | ✓ |
| Crop, rotate & flip (single file) | ✓ | ✓ |
| Metadata viewer | ✓ | ✓ |
| Basic PDF tools (limited pages/files) | ✓ | ✓ |
| Per-file downloads | ✓ | ✓ |
| **Batch processing** (up to 50 files) | — | ✓ |
| **Advanced compression** (target size, exact quality) | — | ✓ |
| **Batch resizing & exact dimensions** | — | ✓ |
| **Batch conversion & quality control** | — | ✓ |
| **Advanced image settings** | — | ✓ |
| **Presets** (built-in + saved custom) | — | ✓ |
| **Processing history** (last 25 jobs) | — | ✓ |
| **ZIP download of results** | — | ✓ |

## How purchasing works

1. A Free user clicks any 🔒 PREMIUM control (or the **Upgrade** button).
2. The upgrade modal shows the price and full Premium feature list.
3. Clicking **Upgrade to Premium →** opens the **configured external checkout URL**
   (`VITE_UPGRADE_URL`, set at build time). FileTools itself never processes payments and
   never sees a card number.
4. The checkout provider issues the customer a **license key**.
5. The customer pastes the key into the modal's *Have a license key?* field → Premium is
   active on that device (stored in `localStorage`, never sent anywhere).

If `VITE_UPGRADE_URL` is not configured, the Upgrade button renders as a clearly disabled
button with an explanation — never a placeholder link, never a fake checkout.

## Configuring price & checkout

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_PREMIUM_PRICE` | `9.99` | Amount shown in the modal & pricing section |
| `VITE_PREMIUM_CURRENCY` | `USD` | ISO 4217 display currency |
| `VITE_UPGRADE_URL` | *(unset)* | Your real checkout/payment page |
| `VITE_PREMIUM_LICENSE_KEY` | `FILETOOLS-PREMIUM` | Key customers enter to unlock Premium |

All four are build-time values (`.env`, see `.env.example`). Changing the price or checkout
URL requires a rebuild — there is no server to reconfigure.

## Connecting a real payment provider later

No code changes are needed — only configuration:

1. Create a checkout with your provider (Lemon Squeezy, Stripe Payment Link, Paddle, Gumroad…).
2. Set `VITE_UPGRADE_URL` to that checkout URL and rebuild.
3. Configure the provider to deliver the license key to buyers (e.g. in the receipt email or
   post-purchase redirect page).
4. Change `VITE_PREMIUM_LICENSE_KEY` to your own key, or extend `isValidLicenseKey` in
   `src/lib/entitlement.ts` if you later want multiple keys or server-side verification.

## Development test mode

Development builds (`npm run dev`) include an isolated **Test Mode** for exercising both
plans without money:

- **🧪 TEST toggle** in the header forces the whole app into Premium or Free.
- **`#/test-checkout`** is an internal page simulating the "return from payment" step.
- Both are compiled out of production builds (`import.meta.env.DEV`); they never ship to
  users, never claim a real payment occurred, and never store credentials.

## Honesty notes

- There is **no fake payment flow**: nothing simulates charging a card, and the UI never
  claims a payment happened.
- Entitlement is client-side by design (see INSTALLATION.md). It is a convenience gate for a
  static product, not a security boundary.
