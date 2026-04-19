require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const { put } = require("@vercel/blob");
const {
  listPosts,
  getPostBySlug,
  getPostById,
  insertPost,
  updatePost,
  deletePost,
  seedIfEmpty,
} = require("./db");
const { renderMarkdown } = require("./markdown");
const {
  appendResponse,
  listResponses,
  markResponseCompleted,
} = require("./investResponses");

function parseTagsFromRequest(body) {
  const raw = body?.tags_json;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  if (typeof body?.category === "string" && body.category.trim()) {
    return [body.category.trim()];
  }
  return undefined;
}

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
seedIfEmpty().catch(e => console.error("[qurve] DB seed failed:", e));

/** Vercel rewrites /api/* → serverless; restore path so Express routes match. */
if (IS_VERCEL) {
  app.use((req, _res, next) => {
    if (typeof req.originalUrl === "string" && req.originalUrl.startsWith("/api")) {
      req.url = req.originalUrl;
    } else {
      const h = req.headers;
      const raw =
        h["x-vercel-original-url"] ||
        h["x-original-url"] ||
        h["x-invoke-path"] ||
        h["x-forwarded-uri"] ||
        h["x-url"];
      if (typeof raw === "string" && raw.startsWith("/api")) {
        try {
          const u = new URL(raw, "http://localhost");
          req.url = u.pathname + u.search;
        } catch {
          const q = raw.includes("?") ? `?${raw.split("?").slice(1).join("?")}` : "";
          req.url = raw.split("?")[0] + q;
        }
      } else if ((req.url === "/" || req.url === "/api" || req.url === "") && typeof h["x-forwarded-path"] === "string") {
        const pathFromFwd = h["x-forwarded-path"];
        if (pathFromFwd.startsWith("/api")) {
          req.url = pathFromFwd + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "");
        }
      }
    }
    next();
  });
}

// We use memoryStorage so we can upload it to Vercel Blob or save locally manually.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Only JPEG, PNG, WebP, or GIF images are allowed."), ok);
  },
});

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, vercel: IS_VERCEL });
});

function validateInvestPayload(body) {
  const errors = [];
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const investmentValue = Number(body?.investmentValue);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (fullName.length < 3) errors.push("Full name is required.");
  if (!/^[a-zA-Z\s.'-]+$/.test(fullName)) errors.push("Full name format is invalid.");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email is invalid.");

  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 10 || digits.length > 15) errors.push("Phone is invalid (10-15 digits).");

  if (!Number.isFinite(investmentValue)) errors.push("Investment value is required.");
  if (Number.isFinite(investmentValue) && (investmentValue < 10000 || investmentValue > 60000000)) {
    errors.push("Investment value must be between 10k and 5cr+.");
  }

  if (message.length < 15) errors.push("Please share a bit more detail in your message.");

  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      fullName,
      email,
      phone: digits,
      investmentValue: Math.round(investmentValue),
      message,
    },
  };
}

// Public endpoint used by the "Invest Now" form.
app.post("/api/invest", async (req, res) => {
  try {
    const v = validateInvestPayload(req.body || {});
    if (!v.ok) return res.status(400).json({ error: v.errors[0] || "Invalid input" });
    const response = await appendResponse(v.normalized);
    return res.status(201).json({ ok: true, response });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Submission failed" });
  }
});

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

// Admin endpoints for the Invest Now CSV-backed responses.
app.get("/api/admin/invest", authAdmin, async (_req, res) => {
  try {
    res.json({ responses: await listResponses() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load responses" });
  }
});

app.put("/api/admin/invest/:id/complete", authAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });
    const completed = req.body?.completed === false ? false : true;
    const response = await markResponseCompleted(id, completed);
    if (!response) return res.status(404).json({ error: "Not found" });
    res.json({ response });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Update failed" });
  }
});

app.get("/api/posts", async (_req, res) => {
  try {
    res.json({ posts: await listPosts() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

app.get("/api/posts/:slug", async (req, res) => {
  try {
    const post = await getPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ error: "Not found" });
    const enriched = { ...post, bodyHtml: renderMarkdown(post.body) };
    res.json({ post: enriched });
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

app.get("/api/admin/posts", authAdmin, async (_req, res) => {
  try {
    res.json({ posts: await listPosts() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

app.post("/api/admin/posts", authAdmin, upload.single("image"), async (req, res) => {
  try {
    const { title, excerpt, body, category, image_url: imageUrlInput } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Title is required" });
    }
    const tags = parseTagsFromRequest(req.body);
    
    let uploadedBlobUrl = null;
    let localFilename = null;

    if (req.file) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { url } = await put(req.file.originalname, req.file.buffer, { access: 'public' });
        uploadedBlobUrl = url;
      } else {
        const ext = path.extname(req.file.originalname).slice(0, 12) || ".jpg";
        localFilename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, localFilename), req.file.buffer);
      }
    }

    const finalImageUrl = uploadedBlobUrl || (typeof imageUrlInput === "string" && imageUrlInput.trim() ? imageUrlInput.trim() : null);

    const post = await insertPost({
      title,
      excerpt,
      body,
      tags,
      category: category || "markets",
      imageFilename: localFilename,
      imageUrl: finalImageUrl,
    });
    res.status(201).json({ post });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Create failed" });
  }
});

app.put("/api/admin/posts/:id", authAdmin, upload.single("image"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await getPostById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { title, excerpt, body, category, slug, image_url: imageUrlBody } = req.body;
    const tags = parseTagsFromRequest(req.body);
    
    let uploadedBlobUrl = null;
    let localFilename = undefined;

    if (req.file) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { url } = await put(req.file.originalname, req.file.buffer, { access: 'public' });
        uploadedBlobUrl = url;
        localFilename = null; // Clear local fallback if moving to blob
      } else {
        const ext = path.extname(req.file.originalname).slice(0, 12) || ".jpg";
        localFilename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, localFilename), req.file.buffer);
        
        if (existing.image_filename) {
          const oldPath = path.join(UPLOAD_DIR, existing.image_filename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }
    }

    const nextUrl = uploadedBlobUrl || (imageUrlBody !== undefined ? (String(imageUrlBody).trim() || null) : undefined);

    const post = await updatePost(id, {
      title: title !== undefined ? title : existing.title,
      excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
      body: body !== undefined ? body : existing.body,
      tags: tags !== undefined ? tags : undefined,
      category: category !== undefined ? category : existing.category,
      slug: slug !== undefined ? slug : undefined,
      imageFilename: localFilename,
      imageUrl: nextUrl,
    });
    res.json({ post });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Update failed" });
  }
});

app.delete("/api/admin/posts/:id", authAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await deletePost(id);
    if (!result.changes) return res.status(404).json({ error: "Not found" });
    if (result.image_filename && !process.env.BLOB_READ_WRITE_TOKEN) {
      const p = path.join(UPLOAD_DIR, result.image_filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    // We do not delete blobs from Vercel natively here to be safe and save auth, but could be added later.
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
