
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

const SYSTEM_PROMPT = `
Sen MEBRU AI'sın. Türkçe konuşan, yardımcı, bilgili ve nazik bir yapay zekâ asistanısın.

Kurallar:
- Kullanıcıya Türkçe cevap ver.
- Açık, anlaşılır ve doğru bilgiler sun.
- Bilmediğin konularda uydurma bilgi verme.
- Matematik sorularını adım adım açıkla.
- Kullanıcının seviyesine uygun anlatım yap.
- Gereksiz uzun cevaplar verme.
- Sana MEBRU'yu kimin icat ettiği veya geliştirdiği sorulursa:
  "Beni Enes Barutcu icat etti ve geliştirdi. Ben MEBRU AI'yım." diye cevap ver.
`;

app.get("/", (req, res) => {
  res.send("MEBRU AI OpenAI sistemi çalışıyor!");
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY Render ayarlarında bulunamadı."
      });
    }

    const { message, history = [], knowledge = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Geçerli bir mesaj gönderilmedi."
      });
    }

    const knowledgeText = Array.isArray(knowledge)
      ? knowledge.map(item =>
          typeof item === "string" ? item : JSON.stringify(item)
        ).join("\n")
      : "";

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT +
          (knowledgeText
            ? "\n\nEk bilgiler:\n" + knowledgeText
            : "")
      }
    ];

    if (Array.isArray(history)) {
      for (const item of history.slice(-20)) {
        if (
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string"
        ) {
          messages.push({
            role: item.role,
            content: item.content
          });
        }
      }
    }

    messages.push({
      role: "user",
      content: message
    });

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: messages
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API hatası:", data.error?.message);

      return res.status(response.status).json({
        error: data.error?.message || "OpenAI API isteği başarısız oldu."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        error: "OpenAI boş cevap döndürdü."
      });
    }

    res.json({
      reply: reply
    });

  } catch (error) {
    console.error("Sunucu hatası:", error.message);

    res.status(500).json({
      error: "Sunucuda bir hata oluştu."
    });
  }
});

app.listen(PORT, () => {
  console.log(`MEBRU AI ${PORT} portunda çalışıyor.`);
});
