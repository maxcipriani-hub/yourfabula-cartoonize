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
       "Converti la persona in un'illustrazione cartoon 2D premium stile Disney attenzione copyright (stile libro illustrato), " +
  "linee pulite, shading morbido, colori caldi. Mantieni volto e tratti riconoscibili. " +
  "Rimuovi look fotografico: nessuna texture foto/rumore. Sfondo semplice, chiaro.";

    // Base64 -> Buffer
const imageBuffer = Buffer.from(imageBase64, "base64");

// ✅ DALL·E 2 edits vuole PNG: forza sempre PNG
const blob = new Blob([imageBuffer], { type: "image/png" });

const form = new FormData();

// ✅ modello economico
form.append("model", "gpt-image-1-mini");

// prompt + qualità/size
form.append("prompt", prompt);
form.append("size", "512x512");
form.append("quality", "low");              // ✅ supportato dai GPT Image models
form.append("output_format", "png");        // ✅ output PNG
form.append("response_format", "b64_json"); // ✅ per avere base64 in risposta

// ⚠️ IMPORTANTE: per GPT Image models usa image[] (non image)
form.append("image[]", blob, "photo.png");


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

   // ✅ GPT Image models: ci aspettiamo b64_json
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
