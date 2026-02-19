export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { imageBase64, name } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const buffer = Buffer.from(imageBase64, "base64");

    const form = new FormData();

    const prompt = `
Trasforma questa foto in una illustrazione cartoon stile libro per bambini.
Colori vividi, linee pulite, luce morbida, stile premium da copertina.
Mantieni la somiglianza del volto.
`;

    form.append("model", "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", "1024x1024");
    form.append("image", imageBuffer);

    const blob = new Blob([buffer], { type: "image/png" });
    form.append("image", blob, "input.png");

    const response = await fetch("https://api.openai.com/v1/images", {

      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: form
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText });
    }

    const data = await response.json();
    const cartoonBase64 = data?.data?.[0]?.b64_json;

    return res.status(200).json({
      cartoonImageBase64: cartoonBase64,
      title: name ? `Le Avventure di ${name}` : "Le Avventure di …"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
