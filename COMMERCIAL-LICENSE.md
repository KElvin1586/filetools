# FileTools Commercial License & Terms of Purchase

This document describes the commercial terms for **FileTools Premium** as distributed by the
deployment owner. It complements the MIT License ([LICENSE.md](LICENSE.md)), which governs the
open-source code itself.

## The product

FileTools is sold as a **one-time purchase** unlock of the Premium feature set inside the
application. There are no subscriptions, no recurring charges, and no accounts.

## What a Premium purchase includes

- Activation of all Premium features (see [PRICING.md](PRICING.md)) on the device/browser
  where the license key is entered.
- License key delivered by the seller's checkout provider.
- Use of the current version indefinitely; the license does not expire.

## Payments

- Payments are processed entirely by the seller's configured external checkout provider
  (the URL set in `VITE_UPGRADE_URL`). FileTools itself never collects, processes, or stores
  payment information.
- Refund, tax, and invoicing terms are those of the checkout provider / seller.

## License activation & storage

- Activation is performed by entering a license key in the app's upgrade modal.
- The entitlement is stored in the browser's `localStorage` **on the user's device only**.
  Clearing site data or switching browsers/devices requires re-entering the key.
- No personal data, payment data, or file contents are transmitted by the app.

## Nature of the entitlement

FileTools is a fully client-side application. Premium unlocks only after a Lemon Squeezy
license key is activated against the real license API, and it is revalidated on every load —
revoked, refunded, or forged records stop unlocking Premium. Editing localStorage, URL
parameters, or console variables cannot bypass activation. As with any client-side-licensed
software, a determined user patching the code itself could bypass checks; buyers pay for a
polished, working product and to support the developer.

## Source code

The FileTools source code is MIT-licensed. Purchasing Premium relates to using a given
deployment as a product; it does not restrict your rights to the source code under the MIT
license.

## Warranty

The product is provided "as is", without warranty of any kind, per the MIT License terms in
[LICENSE.md](LICENSE.md).
