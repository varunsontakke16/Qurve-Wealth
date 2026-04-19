const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function escapeHtml(s) {
  const dom = new JSDOM();
  const d = dom.window.document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

const url = "https://example.com/test?a=1&b=2";
const index = 0;
function thumbClass(i) { return `blog-card__thumb--${i+1}`; }

const htmlStr = `<img src="${escapeHtml(url)}" class="blog-card__thumb blog-card__thumb--photo" style="object-fit:cover; display:block;" onerror="this.onerror=null; this.outerHTML='<div class=\\'blog-card__thumb ${thumbClass(index)}\\' role=\\'presentation\\'></div>';" alt="" />`;

const dom = new JSDOM(`<html><body>${htmlStr}</body></html>`, { runScripts: "dangerously" });

// We simulate an error
const img = dom.window.document.querySelector("img");
const event = new dom.window.Event("error");
img.dispatchEvent(event);

console.log("After error:");
console.log(dom.window.document.body.innerHTML);
