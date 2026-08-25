# Deployment

FileTools builds to a static folder (`dist/`): HTML, CSS, JS and one SVG icon. No server-side
runtime, database, or environment secrets are required. Anything that serves static files will
work.

## 1. Configure — the checkout is already connected

The build ships with the real **Lemon Squeezy** checkout configured:

```
VITE_UPGRADE_URL=https://kelvindigitaltools.lemonsqueezy.com/checkout/buy/5a9a0680-dbb4-4c1b-b38c-02c8bbd20fe1
```

Buyers pay there, receive a license key by email, and activate it in the app's upgrade
modal — activation calls Lemon Squeezy's public license API at runtime, so **no secrets
are needed in this repo at all**. One-time setup lives in the Lemon Squeezy dashboard
(license-key generation on the variant, activation limit); see PRICING.md.

To change the checkout (different product/variant), set `VITE_UPGRADE_URL` in `.env` (or
as a repo Actions variable for the Pages workflow) and rebuild. Optional overrides:
`VITE_PREMIUM_PRICE` (default `9.99`), `VITE_PREMIUM_CURRENCY` (default `USD`).

**Never put Lemon Squeezy API keys, webhook secrets, or payment credentials into `VITE_*`
variables** — they ship publicly in the frontend bundle. The license API authenticates
with the customer's key; it needs no secret.

Env vars are baked into the bundle at build time — rebuild after changing them.

## 2. Build

```bash
npm install
npm run build
```

Output: `dist/`. The default base is `/filetools/` (GitHub Pages). For another sub-path or root hosting, rebuild with `BASE_PATH=/your/path/` (or `BASE_PATH=./` for fully relative assets).

## 3. Host it

### Netlify / Vercel / Cloudflare Pages

- Build command: `npm run build`
- Publish directory: `dist`
- No functions, no redirects needed (hash-based tool routes need no SPA rewrite rules,
  but see below if you add path routing later).

### GitHub Pages (automated — the canonical deployment)

The repository ships with `.github/workflows/deploy.yml`, which builds `dist/` and deploys
it to GitHub Pages on every push to `main` (or manually via the Actions tab).

One-time setup in the GitHub repo:

1. **Settings → Pages → Source: "GitHub Actions".**
2. Optionally set **Settings → Secrets and variables → Actions → Variables**:
   `VITE_UPGRADE_URL` (only to switch product/variant), `VITE_PREMIUM_PRICE`,
   `VITE_PREMIUM_CURRENCY`. These are public build-time values — never put private
   provider secrets in them.
3. Push to `main` or run the workflow manually; the site is published at
   <https://kelvin1586.github.io/filetools/>.

The Vite `base` is `/filetools/` to match the repo name (see `vite.config.ts`; override via
the `BASE_PATH` env var if you fork under a different name). Tool routes are hash-based
(`#/resize`, …), so no SPA rewrite rules are needed.

Manual fallback (not the default):

```bash
npm run build
npx gh-pages -d dist
```

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
4. Try the upgrade modal: the link must open the Lemon Squeezy checkout. Enter an invalid
   key → an error is shown and you stay Free. (A full purchase test requires a real key
   from a Lemon Squeezy test-mode purchase.)

For a full automated check, run the E2E suite against the build (`npm run test:e2e`).
