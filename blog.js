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
  const cat = post.category || "markets";
  const label = CATEGORY_LABEL[cat] || cat;
  const img = post.imageUrl
    ? `<div class="blog-card__thumb blog-card__thumb--photo" style="background-image:url('${escapeHtml(post.imageUrl)}')"></div>`
    : `<div class="blog-card__thumb ${thumbClass(index)}" role="presentation"></div>`;
  const excerpt = post.excerpt || "";
  return `
    <article class="card blog-card reveal visible" data-category="${escapeHtml(cat)}">
      <a href="post.html?slug=${encodeURIComponent(post.slug)}" class="blog-card__link">
        ${img}
        <div class="blog-card__body">
          <div class="blog-card__tags">
            <span class="card-tag">${escapeHtml(label)}</span>
            <span class="card-tag card-tag--soft">Perspective</span>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(excerpt)}</p>
        </div>
      </a>
    </article>
  `;
}

async function loadBlogList() {
  const container = document.getElementById("blog-list");
  const fallback = document.getElementById("blog-list-fallback");
  if (!container) return;

  container.innerHTML = `<p class="muted blog-list-loading">Loading articles…</p>`;
  if (fallback) fallback.classList.add("hidden");

  try {
    const res = await fetch("/api/posts");
    if (!res.ok) throw new Error("Could not load posts");
    const data = await res.json();
    const posts = data.posts || [];
    if (!posts.length) {
      container.innerHTML =
        '<p class="muted">No articles yet. Add one in the <a href="admin.html">admin</a> area.</p>';
      return;
    }
    container.innerHTML = posts.map((p, i) => renderBlogCard(p, i)).join("");
    if (fallback) fallback.classList.add("hidden");
  } catch (e) {
    console.warn(e);
    container.innerHTML = "";
    if (fallback) {
      fallback.classList.remove("hidden");
      fallback.innerHTML =
        "Could not load live articles. Run <code>npm start</code> and open this site from <code>http://127.0.0.1:3000</code> (or your server URL) so the blog API is available.";
    } else {
      container.innerHTML = `<p class="muted">${escapeHtml(e.message)}</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", loadBlogList);
