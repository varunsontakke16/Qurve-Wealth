require("dotenv").config();
const jwt = require("jsonwebtoken");

async function fixPost() {
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "dev-only-change-me-use-long-random-string", { expiresIn: "1h" });
  
  const form = new FormData();
  form.append("title", "Test post fixed");
  form.append("excerpt", "Fixed URL");
  form.append("body", "Test");
  form.append("image_url", "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80");
  form.append("tags_json", "[\"markets\"]");

  const res = await fetch("http://127.0.0.1:3000/api/admin/posts/2", {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: form
  });
  console.log(await res.json());
}
fixPost();
