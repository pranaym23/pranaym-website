// Cloudflare Pages Function — POST /comment
//
// Pipeline: Turnstile gate -> validate -> flood check -> INSERT into D1 with
// status 'pending'. Nothing submitted here is ever shown publicly until it is
// approved by hand (see OPS.md "Moderating comments").
//
// Bindings required on the Pages project:
//   DB               D1 database binding (see wrangler.toml)
//   TURNSTILE_SECRET Turnstile secret key (env var, encrypted)
//   IP_SALT          optional salt for the stored IP hash
import { json, hashIp, validateSubmission, verifyTurnstile } from './_shared.js';

// Max submissions accepted from one address within the window.
const FLOOD_MAX = 5;
const FLOOD_WINDOW_MINUTES = 15;

/**
 * Browsers without JS post the form directly and expect a page back; the
 * enhanced path fetches and expects JSON.
 */
function wantsJson(request) {
  const accept = request.headers.get('Accept') ?? '';
  return accept.includes('application/json') ||
    request.headers.get('X-Requested-With') === 'fetch';
}

function fallbackRedirect(request, status) {
  const referer = request.headers.get('Referer');
  let target = '/reads/';
  try {
    // Only bounce back to our own pages.
    const url = new URL(referer);
    if (url.origin === new URL(request.url).origin) {
      target = `${url.pathname}?comment=${status}#comments`;
    }
  } catch {
    /* no or malformed Referer - fall through to /reads/ */
  }
  return new Response(null, { status: 303, headers: { Location: target } });
}

function fail(request, message, status) {
  return wantsJson(request)
    ? json({ ok: false, error: message }, status)
    : fallbackRedirect(request, 'error');
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return fail(request, 'Comments are not configured.', 503);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(request, 'Malformed submission.', 400);
  }

  const remoteip = request.headers.get('CF-Connecting-IP') ?? '';

  // 1. Turnstile, before any work that touches the database.
  const gate = await verifyTurnstile({
    token: form.get('cf-turnstile-response'),
    secret: env.TURNSTILE_SECRET,
    remoteip,
  });
  if (!gate.ok) return fail(request, gate.error, 403);

  // 2. Shape and length.
  const checked = validateSubmission({
    postId: form.get('post_id'),
    author: form.get('author'),
    body: form.get('comment'),
  });
  if (!checked.ok) return fail(request, checked.error, 400);
  const { postId, author, body } = checked.value;

  // 3. Flood control per address.
  const ipHash = await hashIp(remoteip, env.IP_SALT ?? '');
  if (ipHash) {
    const { results } = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM comments
        WHERE ip_hash = ?1
          AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?2)`
    )
      .bind(ipHash, `-${FLOOD_WINDOW_MINUTES} minutes`)
      .all();

    if ((results?.[0]?.n ?? 0) >= FLOOD_MAX) {
      return fail(request, 'Too many comments just now. Please try again later.', 429);
    }
  }

  // 4. Persist, pending moderation.
  await env.DB.prepare(
    `INSERT INTO comments (post_id, author, body, status, ip_hash, user_agent)
     VALUES (?1, ?2, ?3, 'pending', ?4, ?5)`
  )
    .bind(
      postId,
      author,
      body,
      ipHash,
      (request.headers.get('User-Agent') ?? '').slice(0, 300)
    )
    .run();

  return wantsJson(request)
    ? json({ ok: true, message: 'Thanks. Your comment is awaiting review.' })
    : fallbackRedirect(request, 'received');
}

// A bare GET on /comment is not meaningful; send people to the archive.
export async function onRequestGet() {
  return new Response(null, { status: 303, headers: { Location: '/reads/' } });
}
