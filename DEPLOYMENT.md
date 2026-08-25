# Deployment

FileTools builds to a static folder (`dist/`): HTML, CSS, JS and one SVG icon. No server-side
runtime, database, or environment secrets are required. Anything that serves static files will
work.

## 1. Configure — connecting a real checkout

Everything commercial is configured at build time. In a fresh `.env` (copied from
`.env.example`) the checkout URL is deliberately **unset**, which keeps the Upgrade button
disabled with a plain "not configured" notice — no placeholder is ever shown to users.

To go live with a real payment provider:

1. **Create the product** in your chosen provider (Lemon Squeezy, Stripe, Paddle, Gumroad…).
   One-time product, priced to match `VITE_PREMIUM_PRICE`/`VITE_PREMIUM_CURRENCY`.
2. **Create the checkout/payment link** for that product in the provider's dashboard and
   copy its URL.
3. **Set `VITE_UPGRADE_URL` to that exact URL** in your `.env`:

   ```bash
   VITE_UPGRADE_URL=https://YOUR_REAL_CHECKOUT_URL
   VITE_PREMIUM_LICENSE_KEY=YOUR-REAL-LICENSE-KEY
   VITE_PREMIUM_PRICE=9.99
   VITE_PREMIUM_CURRENCY=USD
   ```

4. **Rebuild the application** (`npm run build`) — `VITE_*` values are baked into the
   bundle; editing `.env` alone changes nothing until you rebuild.
5. **Test the checkout** end-to-end: deploy, open the upgrade modal, click *Upgrade to
   Premium →*, run a test purchase in your provider's sandbox/test mode, and confirm the
   license key you distribute activates Premium in the modal.
6. **Never put private API keys, signing secrets, or payment credentials into `VITE_*`
   variables** — they ship publicly in the frontend bundle. Only public URLs and the
   (public-by-design) license key belong there. Keep private provider credentials in the
   provider dashboard or on your own server, never in this codebase.

Env vars are baked into the bundle at build time — rebuild after changing them.

## 2. Build

```bash
npm install
npm run build
```

Output: `dist/`. The app uses relative asset paths, so it can be served from any sub-path.

## 3. Host it

### Netlify / Vercel / Cloudflare Pages

- Build command: `npm run build`
- Publish directory: `dist`
- No functions, no redirects needed (hash-based tool routes need no SPA rewrite rules,
  but see below if you add path routing later).

### GitHub Pages

```bash
npm run build
# push dist/ to the gh-pages branch, e.g. with:
npx gh-pages -d dist
```

Works out of the box, including under `https://<user>.github.io/<repo>/`.

### Any static server (nginx, Caddy, Apache, S3 + CDN, …)

Copy `dist/` to your web root. Example nginx snippet:

```nginx
server {
  listen 443 ssl;
  server_name filetools.your-domain.com;
  root /var/www/filetools/dist;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Long-cache hashed assets
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}
```

## Recommended headers

The app needs no special headers, but these are good practice for a static file host:

```
Content-Security-Policy: default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; connect-src 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`connect-src 'none'` is safe — FileTools makes no network requests while processing. If you
want the Upgrade link to open normally, that's plain navigation and not affected.

## HTTPS

Serve over HTTPS. Browsers restrict some APIs on insecure origins, and a privacy-focused app
should never be served over plain HTTP.

## Verifying a deployment

1. Open the site, confirm the tool grid and pricing render.
2. Resize a small PNG at 50% and download — open the result and check its dimensions.
3. Open DevTools → Network, process any file, confirm **zero** requests carrying your file.
4. Try the upgrade modal: the external link should point to your checkout URL, and your
   license key should activate Premium.

For a full automated check, run the E2E suite against the build (`npm run test:e2e`).
