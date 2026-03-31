const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function resolveCsvPath() {
  const isVercel = Boolean(process.env.VERCEL);
  if (process.env.INVEST_CSV_PATH) return process.env.INVEST_CSV_PATH;
  if (isVercel) return path.join("/tmp", "qurve-invest", "invest-responses.csv");
  return path.join(__dirname, "..", "data", "invest-responses.csv");
}

function ensureCsvExists(csvPath) {
  const dir = path.dirname(csvPath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(csvPath)) return;
  const header =
    "id,fullName,email,phone,investmentValue,message,createdAt,completed\n";
  fs.writeFileSync(csvPath, header, "utf8");
}

function escapeCsvValue(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Escape double-quotes by doubling them.
  const escaped = s.replace(/"/g, '""');
  // Wrap in quotes if needed.
  if (/[",\n\r]/.test(escaped)) return `"${escaped}"`;
  return escaped;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function readAllResponses() {
  const csvPath = resolveCsvPath();
  ensureCsvExists(csvPath);
  const raw = fs.readFileSync(csvPath, "utf8").trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  if (lines.length <= 1) return [];
  const header = parseCsvLine(lines[0]);
  const idx = {
    id: header.indexOf("id"),
    fullName: header.indexOf("fullName"),
    email: header.indexOf("email"),
    phone: header.indexOf("phone"),
    investmentValue: header.indexOf("investmentValue"),
    message: header.indexOf("message"),
    createdAt: header.indexOf("createdAt"),
    completed: header.indexOf("completed"),
  };

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cols = parseCsvLine(line);
    const r = {
      id: cols[idx.id] || "",
      fullName: cols[idx.fullName] || "",
      email: cols[idx.email] || "",
      phone: cols[idx.phone] || "",
      investmentValue: Number(cols[idx.investmentValue] || 0),
      message: cols[idx.message] || "",
      createdAt: cols[idx.createdAt] || "",
      completed: String(cols[idx.completed] || "0") === "1",
    };
    rows.push(r);
  }
  return rows;
}

function writeAllResponsesAtomic(responses) {
  const csvPath = resolveCsvPath();
  ensureCsvExists(csvPath);
  const header = [
    "id",
    "fullName",
    "email",
    "phone",
    "investmentValue",
    "message",
    "createdAt",
    "completed",
  ];
  const lines = [header.join(",")];
  for (const r of responses) {
    lines.push(
      [
        r.id,
        r.fullName,
        r.email,
        r.phone,
        r.investmentValue,
        r.message,
        r.createdAt,
        r.completed ? "1" : "0",
      ]
        .map(escapeCsvValue)
        .join(",")
    );
  }

  const tmp = `${csvPath}.${process.pid}.tmp-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(tmp, lines.join("\n") + "\n", "utf8");
  fs.renameSync(tmp, csvPath);
}

function appendResponse(payload) {
  const rows = readAllResponses();
  const now = new Date().toISOString();
  const id = payload.id || `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const response = {
    id,
    fullName: payload.fullName || "",
    email: payload.email || "",
    phone: payload.phone || "",
    investmentValue: Number(payload.investmentValue || 0),
    message: payload.message || "",
    createdAt: payload.createdAt || now,
    completed: Boolean(payload.completed),
  };
  rows.push(response);
  writeAllResponsesAtomic(rows);
  return response;
}

function listResponses() {
  return readAllResponses().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function markResponseCompleted(id, completed) {
  const rows = readAllResponses();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], completed: Boolean(completed) };
  writeAllResponsesAtomic(rows);
  return rows[idx];
}

module.exports = {
  appendResponse,
  listResponses,
  markResponseCompleted,
};

