import React, { useEffect, useMemo, useRef, useState } from "react";

const DAILY_LIMIT = 10; // minimal 10x per hari
const STORAGE_KEY = "jt_react_usage_v1";
const CHANNEL_URL = "https://whatsapp.com/channel/0029VbDOUI04NVinhn4Lvw0r";
const URL_RE = /^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+\/\d+\/?$/;
const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "💯", "😎"];

const today = () => new Date().toISOString().slice(0, 10);

function loadUsage() {
  try {
    const u = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (u && u.date === today()) return u;
  } catch {}
  return { date: today(), count: 0 };
}

function saveUsage(u) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } catch {}
}

// Ambil emoji pertama dari teks yang diketik (mendukung emoji gabungan/ZWJ)
function firstEmoji(text) {
  const t = text.trim();
  if (!t) return "";
  const seg =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t)].map((s) => s.segment)
      : Array.from(t);
  const re = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
  return seg.find((g) => re.test(g)) || "";
}

export default function App() {
  const [link, setLink] = useState("");
  const [emojiText, setEmojiText] = useState("👍");
  const [usage, setUsage] = useState(loadUsage);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);
  const [burst, setBurst] = useState(0);
  const inputRef = useRef(null);

  const emoji = useMemo(() => firstEmoji(emojiText), [emojiText]);
  const left = Math.max(0, DAILY_LIMIT - usage.count);
  const linkValid = URL_RE.test(link.trim());
  const canSend = linkValid && !!emoji && left > 0 && !loading;

  useEffect(() => {
    const t = setInterval(() => {
      setUsage((u) => (u.date === today() ? u : { date: today(), count: 0 }));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  async function send(e) {
    e.preventDefault();
    if (!canSend) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim(), reaction: emoji }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        const next = { date: today(), count: usage.count + 1 };
        setUsage(next);
        saveUsage(next);
        setBurst((b) => b + 1);
        setResult({ ok: true, msg: "Reaksi terkirim." });
        setLog((l) => [{ emoji, link: link.trim(), at: new Date(), ok: true }, ...l].slice(0, 6));
      } else {
        const msg = data.message || data?.data?.message || data?.data?.error || "Gagal mengirim reaksi.";
        setResult({ ok: false, msg: String(msg) });
        setLog((l) => [{ emoji, link: link.trim(), at: new Date(), ok: false }, ...l].slice(0, 6));
      }
    } catch {
      setResult({ ok: false, msg: "Koneksi bermasalah. Coba lagi." });
    } finally {
      setLoading(false);
    }
  }

  const pct = (usage.count / DAILY_LIMIT) * 100;

  return (
    <div className="page">
      <header className="top">
        <span className="logo">JT<sup>®</sup></span>
        <span className="top-mid">Jiyyad Tools — Index 05</span>
        <a className="top-link" href={CHANNEL_URL} target="_blank" rel="noreferrer">
          Saluran WhatsApp ↗
        </a>
      </header>

      <section className="hero">
        <p className="eyebrow">( React Channel — v1.0 )</p>
        <h1>
          <span>Kirim</span>
          <span className="outline">reaksi</span>
          <span className="hero-emoji" key={burst}>{emoji || "✦"}</span>
          <span>ke saluran.</span>
        </h1>
        <p className="lede">
          Tempel link postingan saluran WhatsApp, ketik emoji apa saja, kirim. Sederhana, tanpa daftar.
        </p>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="marquee-group">
              {["REACT", "✦", "CHANNEL", "🔥", "JIYYAD TOOLS", "✦", "10X / HARI", "👍"].map((t, j) => (
                <span key={j}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <main className="grid">
        <form className="card form" onSubmit={send}>
          <div className="num">01</div>
          <h2>Kirim reaksi</h2>

          <label className="field">
            <span className="lbl">Link postingan</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://whatsapp.com/channel/…/216"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              spellCheck="false"
              autoComplete="off"
            />
            <small className={link && !linkValid ? "hint bad" : "hint"}>
              {link && !linkValid
                ? "Format harus: whatsapp.com/channel/<id>/<nomor-postingan>"
                : "Salin dari menu bagikan pada postingan saluran."}
            </small>
          </label>

          <label className="field">
            <span className="lbl">Emoji (ketik sendiri atau pilih)</span>
            <div className="emoji-row">
              <input
                ref={inputRef}
                className="emoji-input"
                value={emojiText}
                onChange={(e) => setEmojiText(e.target.value)}
                placeholder="😀"
                aria-label="Emoji reaksi"
              />
              <div className="preview" title="Emoji yang akan dikirim">{emoji || "?"}</div>
            </div>
            <small className={emojiText && !emoji ? "hint bad" : "hint"}>
              {emojiText && !emoji
                ? "Tidak ada emoji terdeteksi. Pakai keyboard emoji."
                : "Hanya emoji pertama yang dikirim."}
            </small>
          </label>

          <div className="quick">
            {QUICK.map((q) => (
              <button
                type="button"
                key={q}
                className={q === emoji ? "chip on" : "chip"}
                onClick={() => {
                  setEmojiText(q);
                  inputRef.current?.focus();
                }}
              >
                {q}
              </button>
            ))}
          </div>

          <button className="send" disabled={!canSend}>
            <span>{loading ? "Mengirim…" : left === 0 ? "Limit habis" : "Kirim reaksi"}</span>
            <span className="arrow">→</span>
          </button>

          {result && (
            <div className={result.ok ? "toast ok" : "toast err"} role="status">
              {result.ok ? "✓ " : "✕ "}
              {result.msg}
            </div>
          )}
        </form>

        <aside className="side">
          <div className="card limit">
            <div className="num">02</div>
            <h2>Limit harian</h2>
            <div className="big">
              {left}
              <small>/ {DAILY_LIMIT}</small>
            </div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <p className="muted">Reset otomatis tiap hari (tengah malam UTC).</p>
          </div>

          <div className="card history">
            <div className="num">03</div>
            <h2>Riwayat</h2>
            {log.length === 0 ? (
              <p className="muted">Belum ada pengiriman.</p>
            ) : (
              <ul>
                {log.map((l, i) => (
                  <li key={i} className={l.ok ? "" : "fail"}>
                    <span className="e">{l.emoji}</span>
                    <span className="u">…{l.link.slice(-18)}</span>
                    <span className="t">
                      {l.at.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>

      <footer className="foot">
        <span>© {new Date().getFullYear()} Jiyyad Tools</span>
        <a href={CHANNEL_URL} target="_blank" rel="noreferrer">Gabung saluran ↗</a>
      </footer>
    </div>
  );
}
