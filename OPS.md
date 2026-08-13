# Site Ops (pranaym.com)

Astro + Cloudflare Pages. Prod = static build, auto-deploys on push to `main`.
Repo: `pranaym-website/`. Node adapter/Keystatic are dev-only.

## Commands (run in `pranaym-website/`)
- `npm run dev` — local dev
- `npm run cms` — dev + open Keystatic editor at `/keystatic`
- `npm run build` — static build (always run before pushing)
- `npm run preview` — serve the built site

## Deploy
Push to `main` → Cloudflare Pages builds & deploys. No manual step.
```
npm run build            # verify it passes
git add -A && git commit -m "..." && git push origin main
```

## Content model (`src/content/`, files are `.md`/`.mdoc`)
- **blog/** frontmatter: `title`, `pubDate` (ISO), `friendlyDate`, `description`, optional `canonical`, `wordpressLink`. Body = article.
- **reads/** frontmatter: `title`, `author`, `domain`, `url`, `pubDate`, `takeaway` (plain string, no em dashes). Body = first-person review + `### What stuck with me` list.
- Schemas: `src/content.config.ts`. Filename = URL slug.

## Add a post
1. New file in `src/content/blog/` or `src/content/reads/` (copy an existing one for frontmatter shape), or use `npm run cms`.
2. `npm run build` to check schema/render.
3. Commit + push.
New files are picked up automatically; routes are `src/pages/blog/[...slug].astro` and `src/pages/reads/[slug].astro`.

## Reads style rules
First person, ~120-180 words, then 3-4 `### What stuck with me` bullets.
No em/en dashes. Avoid AI-tells (delve, seminal, underscores, "it's important to note", forced triples, etc.). Reviews must match the real source; don't invent facts.

## Common edits
- Reads list/cards: `src/pages/reads/index.astro`
- Single read page: `src/pages/reads/[slug].astro`
- Global styles: `src/styles/global.css`
- Layout/head/favicon: `src/layouts/BaseLayout.astro`; site favicon `public/favicon.png`; source-site favicons pull from `https://www.google.com/s2/favicons?domain=<domain>&sz=32`.

## Bulk rewrites via AGY (Gemini, cheap)
One invocation per file, no dangerous flags needed:
```
agy --model gemini-3.6-flash-high --effort high \
    --add-dir src/content/reads -p "<instructions incl. file path>"
```
Then verify: `grep -Rn "—\|–" src/content/reads` (expect none), build, spot-read.

## Comments (Cloudflare D1)
Reads pages carry a comment form. Flow: Turnstile gate -> validate -> flood
check -> `INSERT` into D1 with `status='pending'`. **Nothing is public until you
approve it.** Approved comments are fetched client-side from `/comments`.

- `functions/comment.js` — POST handler; `functions/comments.js` — public GET.
- `functions/_shared.js` — validation, IP hashing, Turnstile verify.
- `schema.sql` — table definition. Database: `pranaym-comments`
  (`e05fefb4-a589-44d6-bca2-fddd0f812fa3`).

### Moderating
```
# See what's waiting
npx wrangler d1 execute pranaym-comments --remote \
  --command="SELECT id, post_id, author, body, created_at FROM comments WHERE status='pending' ORDER BY created_at;"

# Approve / reject one
npx wrangler d1 execute pranaym-comments --remote --command="UPDATE comments SET status='approved' WHERE id=1;"
npx wrangler d1 execute pranaym-comments --remote --command="UPDATE comments SET status='spam' WHERE id=1;"
```

### Required Pages bindings (set in the dashboard, not in a config file)
- `DB` -> D1 database `pranaym-comments`
- `TURNSTILE_SECRET` -> Turnstile secret key (encrypted)
- `IP_SALT` -> any random string; salts the stored IP hash

Do **not** create a `wrangler.toml`. Pages' CI reads that exact filename and
then ignores every dashboard binding, which would silently drop
`TURNSTILE_SECRET` in production. Local dev uses `wrangler.dev.toml`, passed
explicitly.

### Local testing
```
npm run build
npx wrangler d1 execute DB -c wrangler.dev.toml --local --file=./schema.sql
npx wrangler pages dev dist --d1 DB=e05fefb4-a589-44d6-bca2-fddd0f812fa3 \
    --compatibility-date=2025-07-01
```
`.dev.vars` holds Turnstile's public *test* keys (always pass). To exercise the
widget end to end, build with `PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`
so the sitekey matches that test secret. `wrangler pages dev` does not accept
`-c`, hence the inline `--d1` flag; pin `--compatibility-date` or the bundled
workerd rejects today's date.

## Images
`node scripts/optimize-images.mjs [reel|portrait|og]` (no args = all steps).
Idempotent — already-processed files are skipped, so it is safe to re-run.
- Reel photos are stored at 520px wide; the `.photo-card` slot is 260px, so
  that is already 2x. Do not commit 800px+ originals: it put 23MB on the
  homepage.
- `og-default.png` is the 1200x630 social card. Re-render it with
  `node scripts/optimize-images.mjs og` after changing the portrait.

## Notes
- Comments use Cloudflare Turnstile; needs `PUBLIC_TURNSTILE_SITE_KEY` env (else form hidden).
- `/admin` + Keystatic are SSR/dev-only, excluded from prod sitemap.
- `trailingSlash: 'always'`. Every internal href needs its trailing slash or
  Cloudflare 308s on each click. Exceptions: file routes (`/blog/rss.xml`).
- `public/_headers` carries cache + security headers. `/_astro/*` is immutable
  (content-hashed); everything else revalidates.
- **The Pages project must have the "Single Page Application" setting OFF.**
  With it on, every unmatched URL returns index.html with HTTP 200, which makes
  `dist/404.html` unreachable and creates unbounded soft-404 duplicate content.
