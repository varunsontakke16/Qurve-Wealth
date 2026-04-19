const fs = require("fs");
let html = fs.readFileSync("admin.html", "utf8");
html = html.replace(
  '<input\r\n                  id="f-image-url"\r\n                  name="image_url"\r\n                  type="url"\r\n                  placeholder="https://… (recommended on Vercel; persists across deploys)"\r\n                />',
  `<div style="display: flex; gap: 1rem; align-items: flex-start;">\r\n                  <input id="f-image-url" name="image_url" type="url" placeholder="https://… (recommended on Vercel; persists across deploys)" style="flex: 1;" />\r\n                  <img id="image-url-preview" class="hidden" style="max-height: 80px; width: auto; border-radius: 4px; object-fit: cover;" alt="Preview" />\r\n                </div>`
);
fs.writeFileSync("admin.html", html, "utf8");

let js = fs.readFileSync("admin.js", "utf8");
js += `
const fImageUrl = document.getElementById("f-image-url");
const fImageUrlPreview = document.getElementById("image-url-preview");
function updatePreview() {
  if(!fImageUrl || !fImageUrlPreview) return;
  const val = fImageUrl.value.trim();
  if (val) {
    fImageUrlPreview.src = val;
    fImageUrlPreview.classList.remove("hidden");
  } else {
    fImageUrlPreview.classList.add("hidden");
  }
}
if(fImageUrl && fImageUrlPreview) {
  fImageUrl.addEventListener("input", updatePreview);
  fImageUrlPreview.addEventListener("error", () => fImageUrlPreview.classList.add("hidden"));
  setInterval(updatePreview, 1000); // Poll for programmatic changes
}
`;
fs.writeFileSync("admin.js", js, "utf8");
console.log("Patched!");
