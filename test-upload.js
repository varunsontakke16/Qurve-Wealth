require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function testUpload() {
  const FormData = require("form-data");
  const form = new FormData();
  
  // Create a dummy image
  const dummyImagePath = path.join(__dirname, "dummy.jpg");
  fs.writeFileSync(dummyImagePath, "fake image content");
  
  const jwt = require("jsonwebtoken");
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "dev-only-change-me-use-long-random-string");
  
  form.append("title", "Test Upload");
  form.append("excerpt", "Test excerpt");
  form.append("body", "Test body");
  form.append("category", "markets");
  form.append("image", fs.createReadStream(dummyImagePath));
  form.append("tags_json", "[\"markets\"]");
  
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  try {
    const res = await fetch("http://127.0.0.1:3000/api/admin/posts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: form
    });
    const data = await res.json();
    console.log("Response:", res.status, data);
  } catch(e) {
    console.error(e);
  } finally {
    fs.unlinkSync(dummyImagePath);
  }
}
testUpload();
