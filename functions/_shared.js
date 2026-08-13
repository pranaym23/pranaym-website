// Helpers shared by the comment endpoints.

export const MAX_AUTHOR = 80;
export const MAX_BODY = 4000;

/** post_id is minted by the page as `read-<slug>` / `blog-<slug>`. */
const POST_ID_RE = /^(read|blog)-[a-z0-9][a-z0-9-]{0,120}$/;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

/** Truncated SHA-256 — enough to rate-limit, not enough to recover the IP. */
export async function hashIp(ip, salt = '') {
  if (!ip) return null;
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Normalise and check one submission.
 * Returns { ok: true, value } or { ok: false, error }.
 */
export function validateSubmission({ postId, author, body }) {
  const cleanPostId = (postId ?? '').trim();
  if (!POST_ID_RE.test(cleanPostId)) {
    return { ok: false, error: 'Unrecognised post.' };
  }

  // Strip control characters, collapse runs of blank lines, trim.
  const clean = (s) =>
    (s ?? '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const cleanAuthor = clean(author);
  const cleanBody = clean(body);

  if (cleanAuthor.length < 1) return { ok: false, error: 'Please add a name.' };
  if (cleanAuthor.length > MAX_AUTHOR) {
    return { ok: false, error: `Name must be under ${MAX_AUTHOR} characters.` };
  }
  if (cleanBody.length < 2) return { ok: false, error: 'Please write a comment.' };
  if (cleanBody.length > MAX_BODY) {
    return { ok: false, error: `Comment must be under ${MAX_BODY} characters.` };
  }

  return { ok: true, value: { postId: cleanPostId, author: cleanAuthor, body: cleanBody } };
}

/** Canonical Turnstile server-side check. */
export async function verifyTurnstile({ token, secret, remoteip }) {
  if (!secret) return { ok: false, error: 'Comments are not configured.' };
  if (!token) return { ok: false, error: 'Please complete the verification challenge.' };

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, remoteip: remoteip ?? '' }),
  });

  const outcome = await res.json();
  return outcome.success
    ? { ok: true }
    : { ok: false, error: 'Verification failed. Please try again.' };
}
