// Cloudflare Pages Function — GET /comments?post_id=read-<slug>
//
// Serves the approved comments for one post as JSON. The reads pages are fully
// static, so they fetch this on load and render the thread client-side.
// Only status='approved' rows are ever returned; pending/rejected/spam stay
// invisible to the public.
import { json } from './_shared.js';

const POST_ID_RE = /^(read|blog)-[a-z0-9][a-z0-9-]{0,120}$/;
const LIMIT = 200;

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: true, comments: [] });

  const postId = new URL(request.url).searchParams.get('post_id') ?? '';
  if (!POST_ID_RE.test(postId)) {
    return json({ ok: false, error: 'Unrecognised post.' }, 400);
  }

  let results;
  try {
    ({ results } = await env.DB.prepare(
      `SELECT author, body, created_at
         FROM comments
        WHERE post_id = ?1 AND status = 'approved'
        ORDER BY created_at ASC
        LIMIT ?2`
    )
      .bind(postId, LIMIT)
      .all());
  } catch (err) {
    // A database blip should not break the page - the thread just stays empty.
    console.error('GET /comments failed:', err);
    return json({ ok: true, comments: [] });
  }

  return json(
    { ok: true, comments: results ?? [] },
    200,
    // Approved comments change only when moderation runs, so a short shared
    // cache is safe and keeps the D1 read off the hot path.
    { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' }
  );
}
