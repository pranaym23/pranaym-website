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

## Notes
- Comments use Cloudflare Turnstile; needs `PUBLIC_TURNSTILE_SITE_KEY` env (else form hidden).
- `/admin` + Keystatic are SSR/dev-only, excluded from prod sitemap.
