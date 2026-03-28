require("dotenv").config();
const app = require("./app");

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Qurve site + API: http://127.0.0.1:${PORT}`);
});
