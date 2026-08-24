# Deployment

FileTools builds to a static folder (`dist/`): HTML, CSS, JS and one SVG icon. No server-side
runtime, database, or environment secrets are required. Anything that serves static files will
work.

## 1. Configure

Create `.env` from `.env.example` and set at minimum:

```bash
VITE_UPGRADE_URL=https://your-checkout-page.example
VITE_LICENSE_KEY=YOUR-REAL-LICENSE-KEY
VITE_PREMIUM_PRICE=9.99
```

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
