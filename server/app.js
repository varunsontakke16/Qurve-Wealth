require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const {
  listPosts,
  getPostBySlug,
  getPostById,
  insertPost,
  updatePost,
  deletePost,
  seedIfEmpty,
  ensureSamplePost,
} = require("./db");

const app = express();
const ROOT = path.join(__dirname, "..");
const IS_VERCEL = Boolean(process.env.VERCEL);
const UPLOAD_DIR = IS_VERCEL
  ? path.join("/tmp", "qurve-uploads", "blog")
  : path.join(ROOT, "uploads", "blog");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me-in-production";
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me-use-long-random-string";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "12h";

if (!IS_VERCEL) {
  if (!process.env.ADMIN_PASSWORD || ADMIN_PASSWORD === "change-me-in-production") {
    console.warn("[qurve] WARNING: Set ADMIN_PASSWORD in .env for production.");
  }
  if (!process.env.JWT_SECRET || JWT_SECRET.includes("dev-only")) {
    console.warn("[qurve] WARNING: Set JWT_SECRET in .env for production.");
  }
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
seedIfEmpty();
ensureSamplePost();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 12) || ".jpg";
    const safe = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Only JPEG, PNG, WebP, or GIF images are allowed."), ok);
  },
});

app.use(express.json({ limit: "2mb" }));

function authAdmin(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.get("/api/posts", (_req, res) => {
  try {
    res.json({ posts: listPosts() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

app.get("/api/posts/:slug", (req, res) => {
  try {
    const post = getPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json({ post });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load post" });
  }
});

app.post("/api/admin/login", (req, res) => {
  const password = req.body?.password;
  if (typeof password !== "string") {
    return res.status(400).json({ error: "Password required" });
  }
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid password" });
  }
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ token, expiresIn: JWT_EXPIRES });
});

app.get("/api/admin/posts", authAdmin, (_req, res) => {
  res.json({ posts: listPosts() });
});

app.post("/api/admin/posts", authAdmin, upload.single("image"), (req, res) => {
  try {
    const { title, excerpt, body, category, image_url: imageUrl } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Title is required" });
    }
    const post = insertPost({
      title,
      excerpt,
      body,
      category: category || "markets",
      imageFilename: req.file ? req.file.filename : null,
      imageUrl: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
    });
    res.status(201).json({ post });
  } catch (e) {
    console.error(e);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: e.message || "Create failed" });
  }
});

app.put("/api/admin/posts/:id", authAdmin, upload.single("image"), (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = getPostById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { title, excerpt, body, category, slug, image_url: imageUrlBody } = req.body;
    let imageFilename;
    if (req.file) {
      imageFilename = req.file.filename;
      if (existing.image_filename) {
        const oldPath = path.join(UPLOAD_DIR, existing.image_filename);
        fs.unlink(oldPath, () => {});
      }
    }

    const imageUrl =
      imageUrlBody !== undefined
        ? String(imageUrlBody).trim() || null
        : undefined;

    const post = updatePost(id, {
      title: title !== undefined ? title : existing.title,
      excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
      body: body !== undefined ? body : existing.body,
      category: category !== undefined ? category : existing.category,
      slug: slug !== undefined ? slug : undefined,
      imageFilename: req.file ? imageFilename : undefined,
      imageUrl,
    });
    res.json({ post });
  } catch (e) {
    console.error(e);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: e.message || "Update failed" });
  }
});

app.delete("/api/admin/posts/:id", authAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = deletePost(id);
    if (!result.changes) return res.status(404).json({ error: "Not found" });
    if (result.image_filename) {
      fs.unlink(path.join(UPLOAD_DIR, result.image_filename), () => {});
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Delete failed" });
  }
});

if (!IS_VERCEL) {
  app.use("/uploads", express.static(path.join(ROOT, "uploads")));
  app.use(express.static(ROOT));
} else {
  app.use("/uploads/blog", express.static(UPLOAD_DIR));
}

module.exports = app;
