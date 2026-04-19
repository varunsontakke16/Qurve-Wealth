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

function thumbClass(i) {
  return `blog-card__thumb--${(i % 6) + 1}`;
}

function renderBlogCard(post, index) {
  const tags =
    post.tags && post.tags.length ? post.tags : [post.category || "markets"];
  const dataTags = escapeHtml(tags.join(" "));
  const primary = tags[0] || "markets";
  const tagChips = tags
    .map((t) => `<span class="card-tag">${escapeHtml(CATEGORY_LABEL[t] || t)}</span>`)
    .join("");
  const img = post.imageUrl
    ? `<img src="${escapeHtml(post.imageUrl)}" class="blog-card__thumb blog-card__thumb--photo" style="object-fit:cover; display:block;" onerror="this.onerror=null; this.className='blog-card__thumb ${thumbClass(index)}'; this.removeAttribute('src');" alt="" />`
    : `<div class="blog-card__thumb ${thumbClass(index)}" role="presentation"></div>`;
  const excerpt = post.excerpt || "";
  return `
    <article class="card blog-card reveal visible" data-tags="${dataTags}" data-category="${escapeHtml(primary)}">
      <a href="/post?slug=${encodeURIComponent(post.slug)}" class="blog-card__link">
        ${img}
        <div class="blog-card__body">
          <div class="blog-card__tags">
            ${tagChips}
            <span class="card-tag card-tag--soft">Perspective</span>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(excerpt)}</p>
        </div>
      </a>
    </article>
  `;
}

function apiUrl(path) {
  const base = (typeof window !== "undefined" && window.location && window.location.origin) || "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function loadBlogList() {
  const container = document.getElementById("blog-list");
  const fallback = document.getElementById("blog-list-fallback");
  if (!container) return;

  container.innerHTML = `<p class="muted blog-list-loading">Loading articles…</p>`;
  if (fallback) fallback.classList.add("hidden");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(apiUrl("/api/posts"), {
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`Could not load posts (${res.status})`);
    }
    const data = await res.json();
    const posts = data.posts || [];
    if (!posts.length) {
      container.innerHTML =
        '<p class="muted">No articles yet. Add one in the <a href="/admin">admin</a> area.</p>';
      return;
    }
    container.innerHTML = posts.map((p, i) => renderBlogCard(p, i)).join("");
    if (fallback) fallback.classList.add("hidden");
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn(e);
    const msg =
      e.name === "AbortError"
        ? "Request timed out. Check that /api/posts works on your host (open /api/health in a new tab)."
        : e.message || "Network error";
    container.innerHTML = "";
    if (fallback) {
      fallback.classList.remove("hidden");
      fallback.innerHTML = `Could not load articles: ${escapeHtml(msg)} Try <a href="/api/health">/api/health</a> and <a href="/api/posts">/api/posts</a>. On Vercel, confirm env vars and redeploy.`;
    } else {
      container.innerHTML = `<p class="muted">${escapeHtml(msg)}</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", loadBlogList);
