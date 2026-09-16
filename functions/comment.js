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

/**
 * Only ever redirect to a path on this origin.
 *
 * `url.pathname` is not safe to use raw: for a Referer of
 * `https://pranaym.com//evil.com` the origin check passes but the pathname is
 * `//evil.com`, and a `Location: //evil.com` is a protocol-relative URL that
 * browsers resolve to `https://evil.com`. Require a single leading slash and
 * reject anything that could start a new authority.
 */
function safePath(pathname) {
  if (typeof pathname !== 'string') return null;
  // Must be root-relative, and must not begin a `//host` or `/\host` authority.
  if (!/^\/(?![/\\])[^\s]*$/.test(pathname)) return null;
  return pathname;
}

function fallbackRedirect(request, status) {
  const referer = request.headers.get('Referer');
  let target = '/reads/';
  try {
    // Only bounce back to our own pages.
    const url = new URL(referer);
    const path = safePath(url.pathname);
    if (path && url.origin === new URL(request.url).origin) {
      target = `${path}?comment=${status}#comments`;
    }
  } catch {
    /* no or malformed Referer - fall through to /reads/ */
  }
  return new Response(null, {
    status: 303,
    headers: { Location: target, 'Cache-Control': 'no-store' },
  });
}

function fail(request, message, status) {
  return wantsJson(request)
    ? json({ ok: false, error: message }, status)
    : fallbackRedirect(request, 'error');
}

async function handlePost({ request, env }) {
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

  // 3. Flood control per address. Cloudflare always sets CF-Connecting-IP; if it
  // is somehow missing we have no rate-limit key, so refuse rather than letting
  // an unthrottled writer through.
  const ipHash = await hashIp(remoteip, env.IP_SALT ?? '');
  if (!ipHash) {
    return fail(request, 'Could not verify the request source.', 400);
  }

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

/**
 * Never let an internal throw (D1 unavailable, malformed body, ...) escape as a
 * raw 500 with a stack trace. Log it for the tail, return a neutral message.
 */
export async function onRequestPost(context) {
  try {
    return await handlePost(context);
  } catch (err) {
    console.error('POST /comment failed:', err);
    return fail(context.request, 'Something went wrong. Please try again.', 500);
  }
}

// A bare GET on /comment is not meaningful; send people to the archive.
export async function onRequestGet() {
  return new Response(null, { status: 303, headers: { Location: '/reads/' } });
}
