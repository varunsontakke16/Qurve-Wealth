require("dotenv").config();
const jwt = require("jsonwebtoken");

async function run() {
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "dev-only-change-me-use-long-random-string", { expiresIn: "1h" });
  
  const form = new FormData();
  form.append("title", "BMW Example (Fixed)");
  form.append("excerpt", "Direct image link works perfectly.");
  form.append("body", "This post proves that direct image links work.");
  form.append("image_url", "https://www.bmwgroup.com/en/company/_jcr_content/main/layoutcontainer_1988/columncontrol/columncontrolparsys/globalimage.coreimg.jpeg/1758537295862/720x720-i5er.jpeg");
  form.append("tags_json", "[\"markets\"]");

  const res = await fetch("http://127.0.0.1:3000/api/admin/posts/5", {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: form
  });
  console.log(await res.json());
}
run();
