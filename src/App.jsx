// Vercel Serverless Function — menyembunyikan API key dari browser.
// Set environment variable REACT_API_KEY di Vercel (Project → Settings → Environment Variables).

const UPSTREAM = "https://api.jerexd.my.id/api/whatsapp/reactch";
const URL_RE = /^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+\/\d+\/?$/;

// Limit tambahan sisi server (best-effort, per instance): 10x per IP per hari
const DAILY_LIMIT = 10;
const hits = new Map();

function checkLimit(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${day}`;
  const n = (hits.get(key) || 0) + 1;
  if (hits.size > 5000) hits.clear();
  hits.set(key, n);
  return n <= DAILY_LIMIT;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const apikey = process.env.REACT_API_KEY;
  if (!apikey) {
    return res
      .status(500)
      .json({ ok: false, message: "REACT_API_KEY belum diset di environment Vercel." });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const { url, reaction } = body;

  if (typeof url !== "string" || !URL_RE.test(url.trim())) {
    return res.status(400).json({ ok: false, message: "Link postingan saluran tidak valid." });
  }
  if (typeof reaction !== "string" || !reaction.trim() || reaction.length > 16) {
    return res.status(400).json({ ok: false, message: "Emoji tidak valid." });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (!checkLimit(ip)) {
    return res.status(429).json({ ok: false, message: "Limit harian 10x sudah habis." });
  }

  try {
    const r = await fetch(`${UPSTREAM}?apikey=${encodeURIComponent(apikey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), reaction: reaction.trim() }),
    });
    const text = await r.text();
    const data = safeParse(text) ?? { raw: text };
    return res.status(r.ok ? 200 : r.status).json({ ok: r.ok, data });
  } catch (e) {
    return res.status(502).json({ ok: false, message: "Gagal menghubungi server API." });
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
