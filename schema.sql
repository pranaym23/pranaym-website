-- D1 schema for the reads comment system.
-- Apply with:
--   npx wrangler d1 execute pranaym-comments --remote --file=./schema.sql
-- (drop --remote to seed the local dev database instead).

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    TEXT    NOT NULL,
  author     TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  -- 'pending' until approved by hand; only 'approved' rows are ever served.
  status     TEXT    NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- Truncated SHA-256 of the submitter IP. Used only for flood control; the
  -- raw address is never stored.
  ip_hash    TEXT,
  user_agent TEXT
);

-- The public read path: approved comments for one post, oldest first.
CREATE INDEX IF NOT EXISTS idx_comments_post_status
  ON comments (post_id, status, created_at);

-- The flood-control path: recent submissions from one address.
CREATE INDEX IF NOT EXISTS idx_comments_ip_recent
  ON comments (ip_hash, created_at);

-- The moderation queue.
CREATE INDEX IF NOT EXISTS idx_comments_status_created
  ON comments (status, created_at);
