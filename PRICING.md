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
3. Clicking **Upgrade to Premium →** opens the **Lemon Squeezy checkout**
   (payments are processed entirely by Lemon Squeezy — FileTools never sees a card).
4. Lemon Squeezy emails the customer a **license key** after purchase.
5. The customer pastes the key into the modal's license field. The app **activates the
   key against Lemon Squeezy's real license API** (`/v1/licenses/activate`) and Premium
   unlocks only on a genuine, activated license.
6. On every subsequent load the stored license is **revalidated**
   (`/v1/licenses/validate`): disabled, refunded, expired, or fabricated records stop
   unlocking Premium. If the license server is unreachable, a previously activated
   license keeps working (offline grace).

Tamper notes: there is **no static/shared license key** in the app, and no plain
`premium` flag in storage — editing localStorage, URL parameters, or console variables
cannot produce a license that survives revalidation. (As with any client-side software,
the gate is enforcement-by-verification, not DRM: a determined user patching the JS
bundle itself could bypass checks, which is true of every client-side-licensed app.)

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_PREMIUM_PRICE` | `9.99` | Amount shown in the modal & pricing section |
| `VITE_PREMIUM_CURRENCY` | `USD` | ISO 4217 display currency |
| `VITE_UPGRADE_URL` | the live Lemon Squeezy checkout | Where the Upgrade button sends buyers |

All are build-time values (`.env`, see `.env.example`). Changing the price or checkout
URL requires a rebuild — there is no server to reconfigure.

**Never put Lemon Squeezy API keys, webhook signing secrets, or any payment credential
in `VITE_*` variables** — they ship publicly in the frontend bundle. The license API
used for activation needs no secret: it authenticates with the customer's key itself.

## Lemon Squeezy store setup (one-time, in your dashboard)

For the full purchase → license-key flow, the product behind the checkout link must have
license-key generation enabled:

1. In the Lemon Squeezy dashboard, open the product/variant sold at the checkout URL.
2. Enable **license key generation** for the variant, choose an activation limit
   (e.g. 3 devices) and no expiry.
3. Buyers then receive a license key by email automatically after purchase.

Without this step, purchases succeed but buyers receive no key to activate.

## Development test mode — not a payment

Development builds (`npm run dev`) include an isolated **Test Mode** for exercising both
plans without money:

- **🧪 TEST toggle** in the header forces the whole app into Premium or Free.
- **`#/test-checkout`** is an internal page simulating the "return from payment" step.

> ⚠️ **DEVELOPMENT TEST MODE ≠ REAL CUSTOMER PAYMENT.** Test Mode exists only so developers
> can QA both plans locally. It is compiled out of production builds entirely
> (`import.meta.env.DEV`), never ships to users, never claims a real payment occurred, and
> never stores credentials. Real customers unlock Premium exclusively through the Lemon
> Squeezy checkout + license key activation.

## Honesty notes

- There is **no fake payment flow**: nothing simulates charging a card, and the UI never
  claims a payment happened.
- License checks are **real**: activation and revalidation call Lemon Squeezy's license
  API. Premium cannot be unlocked by editing localStorage, URL parameters, or console
  variables — a forged record fails revalidation and is discarded.
