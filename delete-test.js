require("dotenv").config();
const jwt = require("jsonwebtoken");

async function run() {
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "dev-only-change-me-use-long-random-string", { expiresIn: "1h" });
  const res = await fetch("http://127.0.0.1:3000/api/admin/posts/3", {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log(await res.json());
}
run();
