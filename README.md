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

---

## Deploy on Vercel (testing)

1. Push this repo to GitHub/GitLab/Bitbucket and **Import** the project in the [Vercel dashboard](https://vercel.com/).
2. **Framework preset:** Other (static + serverless API).
3. **Environment variables** (Project → Settings → Environment Variables):

| Name | Value |
|------|--------|
| `ADMIN_PASSWORD` | Strong password for `/admin.html` |
| `JWT_SECRET` | Long random string (32+ characters) |

4. **Redeploy** after saving env vars.

### How it behaves on Vercel

- **HTML/CSS/JS** are served from the project root as static files.
- **`/api/*`** is handled by **`api/index.js`** (Express via `serverless-http`).
- **Blog JSON** defaults to **`/tmp/blog.json`** on Vercel (`VERCEL` is set automatically). That storage is **ephemeral** (can reset between invocations or deploys). For real testing of persistent content, either:
  - Use **Image URL** in the admin (HTTPS image links work reliably), and accept that **post text** may reset unless you add a managed database later, **or**
  - Add **Vercel Postgres**, **KV**, or another hosted DB and replace `server/db.js` with a driver for that store.
- **File uploads** on Vercel use **`/tmp`** for the process; prefer **Image URL** for thumbnails on serverless so images survive cold starts.

### Local vs Vercel

- **Local:** `npm start` → `data/blog.json` + `uploads/blog/` (persistent).
- **Vercel:** same API paths; use dashboard env vars; prefer **Image URL** for hero images.
