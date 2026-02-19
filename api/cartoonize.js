export default async function handler(req, res) {
  try {
    // Solo POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

    const { imageBase64, name } = req.body || {};
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
    const blob = new Blob([imageBuffer], { type: "image/png" });

    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", "1024x1024");

    // 👇 campo richiesto per /v1/images/edits
    form.append("image", blob, "photo.png");

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
