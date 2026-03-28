# Qurve Wealth — site + blog

Static pages (home, philosophy, strategy, tools, contact) are plain HTML/CSS/JS. The **Perspective** blog is backed by a small **Node.js + Express** API with a **JSON file** datastore (`data/blog.json`) so posts can be managed from a password-protected **admin** page—no native database drivers required.

## Run locally (blog + API)

1. Install [Node.js](https://nodejs.org/) 18+.
2. In this folder:

```bash
npm install
```

3. Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `ADMIN_PASSWORD` | Password for `/admin.html` |
| `JWT_SECRET` | Secret used to sign admin session tokens (use a long random string) |
| `PORT` | Optional; default `3000` |
| `DB_PATH` | Optional; default `./data/blog.json` |

4. Start the server:

```bash
npm start
```

5. Open **http://127.0.0.1:3000** (or your `PORT`).

- **Blog listing:** `/blogs.html`
- **Single post:** `/post.html?slug=your-post-slug`
- **Admin:** `/admin.html`

Opening HTML files directly (`file://`) will **not** load `/api/posts`; use `npm start` so the API and uploads are served.

## Database

- **Engine:** JSON file (`data/blog.json`), written atomically on each change.
- **Fields per post:** `slug`, `title`, `excerpt`, `body`, `category`, `image_filename`, `created_at`, `updated_at`.

### If you need something heavier later

For production at scale, multi-server hosting, or strict compliance, you can move the same fields to **PostgreSQL**, **MySQL**, or **SQLite** and keep the Express routes; only `server/db.js` would change.

### Backups

- Copy `data/blog.json` and the `uploads/blog/` folder together (images are referenced by filename in the JSON).

## API (summary)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/posts` | Public |
| GET | `/api/posts/:slug` | Public |
| POST | `/api/admin/login` | Body: `{ "password": "..." }` → JWT |
| GET | `/api/admin/posts` | Bearer JWT |
| POST | `/api/admin/posts` | Bearer JWT + `multipart/form-data` |
| PUT | `/api/admin/posts/:id` | Bearer JWT + `multipart/form-data` |
| DELETE | `/api/admin/posts/:id` | Bearer JWT |

Uploaded images are stored under `uploads/blog/` and served at `/uploads/blog/...`.
