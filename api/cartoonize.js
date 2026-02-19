export default async function handler(req, res) {
  try {
    // ===== CORS (per Shopify / browser) =====
res.setHeader("Access-Control-Allow-Origin", "https://yourfabula.it");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

// Preflight
if (req.method === "OPTIONS") {
  return res.status(200).end();
}

    // Solo POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

const { imageBase64, name, mimeType } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY on Vercel" });
    }

    // Prompt cartoon
    const safeName = (name || "").toString().trim();
    const prompt =
      `Trasforma la persona della foto in stile cartoon illustrato, pulito e premium, ` +
      `linee morbide, colori caldi, aspetto amichevole. Mantieni somiglianza e volto riconoscibile. ` +
      `Sfondo semplice.`;

    // Base64 -> file PNG (Buffer) con filename (IMPORTANTISSIMO)
    const imageBuffer = Buffer.from(imageBase64, "base64");

// fallback + whitelist mime
const safeMime = (mimeType || "").toLowerCase();
const allowed = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

const finalMime = allowed.has(safeMime)
  ? (safeMime === "image/jpg" ? "image/jpeg" : safeMime)
  : "image/jpeg";

const ext = finalMime === "image/png" ? "png" :
            finalMime === "image/webp" ? "webp" : "jpg";

const blob = new Blob([imageBuffer], { type: finalMime });


    const form = new FormData();
    form.append("model", "dall-e-2");
    form.append("prompt", prompt);
    form.append("size", "512x512");

    // 👇 campo richiesto per /v1/images/edits
form.append("image", blob, `photo.${ext}`);

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const data = await response.json();

    if (!response.ok) {
      // Ritorna l'errore vero (così lo vedi in console)
      return res.status(response.status).json({
        error: "OpenAI error",
        details: data,
      });
    }

    // gpt-image-1 ritorna base64 in data[0].b64_json
    const cartoonImageBase64 = data?.data?.[0]?.b64_json;
    if (!cartoonImageBase64) {
      return res.status(500).json({
        error: "No image returned from OpenAI",
        details: data,
      });
    }

    // Titolo suggerito (semplice)
    const title = safeName ? `Le Avventure di ${safeName}` : "Le Avventure di …";

    return res.status(200).json({
      cartoonImageBase64,
      title,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
}
