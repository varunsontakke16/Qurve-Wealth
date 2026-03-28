const CATEGORY_LABEL = {
  markets: "Markets",
  economy: "Economy",
  "personal-finance": "Personal Finance",
  "consumer-behaviour": "Consumer Behaviour",
};

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function bodyToHtml(text) {
  if (!text) return "<p></p>";
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function apiUrl(path) {
  const base = (typeof window !== "undefined" && window.location && window.location.origin) || "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const loading = document.getElementById("post-loading");
  const root = document.getElementById("post-content");
  const err = document.getElementById("post-error");

  if (!slug) {
    loading.classList.add("hidden");
    err.classList.remove("hidden");
    err.innerHTML = "<p>Missing article link.</p>";
    return;
  }

  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("Article not found");
    const { post } = await res.json();
    const cat = CATEGORY_LABEL[post.category] || post.category;
    document.title = `${post.title} | Qurve Wealth`;

    const heroImg = post.imageUrl
      ? `<div class="post-hero__media"><img src="${escapeHtml(post.imageUrl)}" alt="" width="1200" height="675" loading="eager" /></div>`
      : `<div class="post-hero__media post-hero__media--gradient" role="presentation"></div>`;

    root.innerHTML = `
      <header class="post-hero">
        ${heroImg}
        <div class="post-hero__text">
          <p class="eyebrow">${escapeHtml(cat)}</p>
          <time class="post-date" datetime="${escapeHtml(post.updatedAt || "")}">${escapeHtml(formatDate(post.updatedAt))}</time>
          <h1 class="post-title">${escapeHtml(post.title)}</h1>
          ${post.excerpt ? `<p class="post-excerpt">${escapeHtml(post.excerpt)}</p>` : ""}
        </div>
      </header>
      <div class="post-body">${bodyToHtml(post.body)}</div>
    `;
    loading.classList.add("hidden");
    root.classList.remove("hidden");
  } catch (e) {
    clearTimeout(timeoutId);
    loading.classList.add("hidden");
    err.classList.remove("hidden");
    const hint =
      e.name === "AbortError"
        ? 'Request timed out. Check <a href="/api/health">/api/health</a> on this domain.'
        : escapeHtml(e.message || "Error");
    err.innerHTML = `<p>${hint}</p><p class="muted">Use a valid link from Perspective. If you deploy on Vercel, ensure the API is deployed and env vars are set.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadPost);
