require("dotenv").config();
async function checkDb() {
  const response = await fetch("https://or6edmhq5lc1rbv8.public.blob.vercel-storage.com/qurve/db/blog.json");
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
checkDb();
