const fs = require("fs");
const path = require("path");

function resolveDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (process.env.VERCEL) return path.join("/tmp", "blog.json");
  return path.join(__dirname, "..", "data", "blog.json");
}

const dbPath = resolveDbPath();

function readDb() {
  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { posts: [] };
  }
}

function writeDbAtomic(data) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const tmp = `${dbPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, dbPath);
}

function rowToPost(row) {
  if (!row) return null;
  const fromFile = row.image_filename ? `/uploads/blog/${row.image_filename}` : null;
  const fromUrl = row.image_url && String(row.image_url).trim() ? String(row.image_url).trim() : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    category: row.category,
    imageUrl: fromUrl || fromFile,
    image_url: fromUrl,
    image_filename: row.image_filename || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listPosts() {
  const { posts } = readDb();
  return [...posts]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map(rowToPost);
}

function getPostBySlug(slug) {
  const { posts } = readDb();
  const row = posts.find((p) => p.slug === slug);
  return rowToPost(row);
}

function getPostById(id) {
  const { posts } = readDb();
  const row = posts.find((p) => p.id === id);
  return rowToPost(row);
}

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "post";
}

function ensureUniqueSlug(base, excludeId) {
  const { posts } = readDb();
  let slug = base;
  let n = 2;
  while (true) {
    const existing = posts.find((p) => p.slug === slug && p.id !== excludeId);
    if (!existing) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

function nextId(posts) {
  if (!posts.length) return 1;
  return Math.max(...posts.map((p) => p.id)) + 1;
}

function insertPost({ title, excerpt, body, category, imageFilename, imageUrl }) {
  const data = readDb();
  const base = slugify(title);
  const slug = ensureUniqueSlug(base);
  const id = nextId(data.posts);
  const now = new Date().toISOString();
  const row = {
    id,
    slug,
    title,
    excerpt: excerpt || "",
    body: body || "",
    category: category || "markets",
    image_filename: imageFilename || null,
    image_url: imageUrl || null,
    created_at: now,
    updated_at: now,
  };
  data.posts.push(row);
  writeDbAtomic(data);
  return rowToPost(row);
}

function updatePost(id, { title, excerpt, body, category, imageFilename, imageUrl, slug: slugOverride }) {
  const data = readDb();
  const idx = data.posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const existing = data.posts[idx];
  let slug = existing.slug;
  if (slugOverride && String(slugOverride).trim()) {
    slug = ensureUniqueSlug(slugify(slugOverride), id);
  } else if (title && title !== existing.title) {
    slug = ensureUniqueSlug(slugify(title), id);
  }
  const nextFile =
    imageFilename !== undefined ? imageFilename : existing.image_filename;
  const nextUrl =
    imageUrl !== undefined ? imageUrl : existing.image_url;
  const updated = {
    ...existing,
    slug,
    title: title ?? existing.title,
    excerpt: excerpt ?? existing.excerpt,
    body: body ?? existing.body,
    category: category ?? existing.category,
    image_filename: nextFile,
    image_url: nextUrl,
    updated_at: new Date().toISOString(),
  };
  data.posts[idx] = updated;
  writeDbAtomic(data);
  return rowToPost(updated);
}

function deletePost(id) {
  const data = readDb();
  const idx = data.posts.findIndex((p) => p.id === id);
  if (idx === -1) return { changes: 0, image_filename: null };
  const image_filename = data.posts[idx].image_filename;
  data.posts.splice(idx, 1);
  writeDbAtomic(data);
  return { changes: 1, image_filename };
}

function seedIfEmpty() {
  const data = readDb();
  if (data.posts.length > 0) return;
  insertPost({
    title: "US Bond Volatility Is Back",
    excerpt: "How term premium repricing is leaking into equity dispersion.",
    body: "How term premium repricing is leaking into equity dispersion and creating tactical opportunities.\n\nWe unpack what to watch next and how to think about duration in the current regime.",
    category: "markets",
    imageFilename: null,
  });
}

module.exports = {
  listPosts,
  getPostBySlug,
  getPostById,
  insertPost,
  updatePost,
  deletePost,
  slugify,
  seedIfEmpty,
};
