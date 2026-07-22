// Cloudflare Pages Function — handles POST /comment for the reads comment form.
//
// Its only job here is the canonical Cloudflare Turnstile server-side check:
// validate the cf-turnstile-response token before any comment is accepted.
// The secret is read from the Pages environment (TURNSTILE_SECRET) — never
// hard-coded. Locally it comes from .dev.vars; in production from the Pages
// project's environment variables.
export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const token = formData.get('cf-turnstile-response');
  const remoteip = request.headers.get('CF-Connecting-IP') ?? '';

  // Canonical siteverify: browser -> this backend -> challenges.cloudflare.com.
  const verifyRes = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token ?? '',
        remoteip,
      }),
    },
  );
  const outcome = await verifyRes.json();

  if (!outcome.success) {
    return new Response('Turnstile verification failed.', { status: 403 });
  }

  // --- Verified human below this line. ---
  // Existing comment-handling logic (persist / forward the comment) would run
  // here, unchanged. This integration only adds the gate above; comment
  // storage/delivery is intentionally out of scope.
  return new Response('Thanks — your comment was received.', { status: 200 });
}
