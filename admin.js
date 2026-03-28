const TOKEN_KEY = "qurve_admin_jwt";

function apiBase() {
  return "";
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(t) {
  if (t) sessionStorage.setItem(TOKEN_KEY, t);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function api(path, opts = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...opts.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const loginSection = document.getElementById("login-section");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-msg");
const adminApp = document.getElementById("admin-app");
const postsTbody = document.getElementById("posts-tbody");
const adminStatus = document.getElementById("admin-status");
const btnNew = document.getElementById("btn-new-post");
const btnLogout = document.getElementById("btn-logout");
const editorSection = document.getElementById("editor-section");
const postForm = document.getElementById("post-form");
const editId = document.getElementById("edit-id");
const formMsg = document.getElementById("form-msg");
const btnCancel = document.getElementById("btn-cancel-edit");
const tagsJsonInput = document.getElementById("f-tags-json");

let bodyEditor = null;

function ensureBodyEditor() {
  if (bodyEditor) return bodyEditor;
  const ta = document.getElementById("f-body");
  if (!ta || typeof EasyMDE === "undefined") return null;
  bodyEditor = new EasyMDE({
    element: ta,
    spellChecker: false,
    status: ["lines", "words", "cursor"],
    minHeight: "300px",
    renderingConfig: {
      singleLineBreaks: false,
      codeSyntaxHighlighting: false,
    },
    previewClass: "editor-preview",
  });
  return bodyEditor;
}

function setTagCheckboxes(slugs) {
  const set = new Set(Array.isArray(slugs) && slugs.length ? slugs : ["markets"]);
  document.querySelectorAll(".admin-tag-cb").forEach((cb) => {
    cb.checked = set.has(cb.value);
  });
}

function readSelectedTags() {
  return [...document.querySelectorAll(".admin-tag-cb:checked")].map((cb) => cb.value);
}

function showLogin() {
  loginSection.classList.remove("hidden");
  adminApp.classList.add("hidden");
}

function showApp() {
  loginSection.classList.add("hidden");
  adminApp.classList.remove("hidden");
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function loadPosts() {
  adminStatus.textContent = "Loading…";
  const { posts } = await api("/api/admin/posts");
  adminStatus.textContent = `${posts.length} post(s)`;
  postsTbody.innerHTML = "";
  posts.forEach((p) => {
    const tags =
      p.tags && p.tags.length ? p.tags.join(", ") : p.category || "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(p.title)}</strong><br><span class="muted" style="font-size:0.8rem">${escapeHtml(p.slug)}</span></td>
      <td>${escapeHtml(tags)}</td>
      <td>${escapeHtml(formatDate(p.updatedAt))}</td>
      <td class="admin-row-actions">
        <button type="button" class="filter-btn" data-edit="${p.id}">Edit</button>
        <button type="button" class="filter-btn" data-del="${p.id}">Delete</button>
      </td>
    `;
    postsTbody.appendChild(tr);
  });

  postsTbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(Number(btn.dataset.edit)));
  });
  postsTbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this post?")) return;
      try {
        await api(`/api/admin/posts/${btn.dataset.del}`, { method: "DELETE" });
        await loadPosts();
      } catch (e) {
        alert(e.message);
      }
    });
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function resetForm() {
  postForm.reset();
  editId.value = "";
  tagsJsonInput.value = "[]";
  document.getElementById("f-image-url").value = "";
  document.getElementById("editor-title").textContent = "New post";
  setTagCheckboxes(["markets"]);
  if (bodyEditor) {
    bodyEditor.value("");
  }
}

function startNew() {
  resetForm();
  editorSection.classList.remove("hidden");
  editorSection.scrollIntoView({ behavior: "smooth" });
}

async function startEdit(id) {
  const { posts } = await api("/api/admin/posts");
  const p = posts.find((x) => x.id === id);
  if (!p) return;
  editId.value = String(p.id);
  document.getElementById("f-title").value = p.title;
  document.getElementById("f-slug").value = p.slug;
  document.getElementById("f-excerpt").value = p.excerpt || "";
  document.getElementById("f-body").value = p.body || "";
  setTagCheckboxes(p.tags && p.tags.length ? p.tags : [p.category || "markets"]);
  document.getElementById("f-image-url").value = p.image_url || "";
  document.getElementById("f-image").value = "";
  document.getElementById("editor-title").textContent = "Edit post";
  editorSection.classList.remove("hidden");
  ensureBodyEditor();
  if (bodyEditor) bodyEditor.value(p.body || "");
  editorSection.scrollIntoView({ behavior: "smooth" });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "";
  const password = document.getElementById("admin-password").value;
  try {
    const { token } = await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setToken(token);
    showApp();
    await loadPosts();
  } catch (err) {
    loginMsg.textContent = err.message || "Login failed";
  }
});

btnLogout.addEventListener("click", () => {
  setToken(null);
  showLogin();
});

btnNew.addEventListener("click", () => startNew());

btnCancel.addEventListener("click", () => {
  editorSection.classList.add("hidden");
  resetForm();
});

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMsg.textContent = "Saving…";
  const id = editId.value;
  ensureBodyEditor();
  if (bodyEditor) bodyEditor.codemirror.save();
  const selectedTags = readSelectedTags();
  if (!selectedTags.length) {
    formMsg.textContent = "Select at least one tag";
    return;
  }
  tagsJsonInput.value = JSON.stringify(selectedTags);
  const fd = new FormData(postForm);
  if (!fd.get("title")) {
    formMsg.textContent = "Title required";
    return;
  }
  try {
    if (id) {
      await api(`/api/admin/posts/${id}`, { method: "PUT", body: fd });
    } else {
      fd.delete("id");
      await api("/api/admin/posts", { method: "POST", body: fd });
    }
    formMsg.textContent = "Saved.";
    editorSection.classList.add("hidden");
    resetForm();
    await loadPosts();
  } catch (err) {
    formMsg.textContent = err.message || "Save failed";
  }
});

if (getToken()) {
  showApp();
  loadPosts().catch(() => {
    showLogin();
  });
}
