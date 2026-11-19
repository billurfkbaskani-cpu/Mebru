
const API_URL = "https://mebru-1.onrender.com/api/chat";

const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

const chatPage = document.getElementById("chatPage");
const learnPage = document.getElementById("learnPage");

const voicePage = document.getElementById("voicePage");
const voiceOrb = document.getElementById("voiceOrb");
const voiceStatus = document.getElementById("voiceStatus");
const voiceSubtitle = document.getElementById("voiceSubtitle");

const closeVoiceBtn = document.getElementById("closeVoiceBtn");
const voiceEndBtn = document.getElementById("voiceEndBtn");

const knowledgeInput = document.getElementById("knowledgeInput");
const saveKnowledge = document.getElementById("saveKnowledge");
const knowledgeList = document.getElementById("knowledgeList");

let history = JSON.parse(localStorage.getItem("mebru_history") || "[]");
let knowledge = JSON.parse(localStorage.getItem("mebru_knowledge") || "[]");

let recognition = null;
let busy = false;
let voiceMode = false;

function saveHistory() {
  localStorage.setItem("mebru_history", JSON.stringify(history));
}

function saveKnowledgeData() {
  localStorage.setItem("mebru_knowledge", JSON.stringify(knowledge));
}

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = "message " + type;
  div.textContent = text;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

function showWelcome() {
  chatArea.innerHTML = `
    <div class="welcome">
      <div class="big-logo">M</div>
      <h1>MEBRU AI</h1>
      <p>Merhaba! Sana nasıl yardımcı olabilirim?</p>
    </div>
  `;
}

function renderHistory() {
  chatArea.innerHTML = "";

  if (history.length === 0) {
    showWelcome();
    return;
  }

  history.forEach(item => {
    addMessage(item.content, item.role === "user" ? "user" : "ai");
  });
}

function setVoiceStatus(status, subtitle, animation) {
  voiceStatus.textContent = status;
  voiceSubtitle.textContent = subtitle;

  voiceOrb.classList.remove("listening", "speaking");

  if (animation) {
    voiceOrb.classList.add(animation);
  }
}

async function sendMessage(text, voiceReply = false) {
  text = text.trim();

  if (!text || busy) return;

  busy = true;
  sendBtn.disabled = true;

  messageInput.value = "";
  messageInput.style.height = "48px";

  if (history.length === 0) {
    chatArea.innerHTML = "";
  }

  history.push({
    role: "user",
    content: text
  });

  addMessage(text, "user");
  saveHistory();

  const loading = addMessage("MEBRU düşünüyor...", "ai");

  if (voiceReply) {
    setVoiceStatus("MEBRU düşünüyor", "Cevabını hazırlıyor...", "");
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        history: history.slice(-20),
        knowledge: knowledge.slice(-50)
      })
    });

    const rawText = await response.text();

    let data;

    try {
      data = JSON.parse(rawText);
    } catch (error) {
      throw new Error(
        "Sunucu JSON yerine farklı cevap gönderdi: " +
        rawText.substring(0, 150)
      );
    }

    if (!response.ok) {
      throw new Error(data.error || "Sunucu hatası: " + response.status);
    }

    const reply = data.reply || "Cevap oluşturulamadı.";

    loading.textContent = reply;

    history.push({
      role: "assistant",
      content: reply
    });

    saveHistory();

    if (voiceReply && voiceMode) {
      speak(reply);
    }

  } catch (error) {
    loading.textContent = "Hata: " + error.message;

    if (voiceReply && voiceMode) {
      setVoiceStatus("Bir hata oluştu", "Tekrar deneyebilirsin", "");
    }

  } finally {
    busy = false;
    sendBtn.disabled = false;
    chatArea.scrollTop = chatArea.scrollHeight;

    if (voiceReply && voiceMode &&
        !window.speechSynthesis?.speaking) {
      startListening();
    }
  }
}

// SESLİ OKUMA

function speak(text) {
  if (!("speechSynthesis" in window)) {
    setVoiceStatus("Ses desteklenmiyor", "Tarayıcını kontrol et", "");
    return;
  }

  // MEBRU AI isminin harf harf okunmasını önle.
  const spokenText = text
    .replace(/\bMEBRU\s*AI\b/gi, "Mebru Ay")
    .replace(/\bMEBRU\b/gi, "Mebru");

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(spokenText);

  utterance.lang = "tr-TR";
  utterance.rate = 1;
  utterance.pitch = 1;

  setVoiceStatus(
    "MEBRU konuşuyor",
    "Cevabını dinle",
    "speaking"
  );

  utterance.onend = () => {
    if (voiceMode) {
      startListening();
    }
  };

  utterance.onerror = () => {
    if (voiceMode) {
      startListening();
    }
  };

  window.speechSynthesis.speak(utterance);
}

// NORMAL SOHBET

sendBtn.addEventListener("click", () => {
  sendMessage(messageInput.value, false);
});

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(messageInput.value, false);
  }
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = "48px";
  messageInput.style.height =
    Math.min(messageInput.scrollHeight, 160) + "px";
});

// YENİ SOHBET

document.getElementById("newChatBtn").addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});

// SEKME DEĞİŞTİRME

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t =>
      t.classList.remove("active")
    );

    tab.classList.add("active");

    const page = tab.dataset.page;

    chatPage.classList.toggle("hidden", page !== "chat");
    learnPage.classList.toggle("hidden", page !== "learn");

    if (page === "learn") {
      renderKnowledge();
    }
  });
});

// BİLGİ MERKEZİ

saveKnowledge.addEventListener("click", () => {
  const text = knowledgeInput.value.trim();

  if (!text) return;

  knowledge.unshift({
    id: Date.now(),
    text
  });

  saveKnowledgeData();
  knowledgeInput.value = "";
  renderKnowledge();

  alert("Bilgi kaydedildi.");
});

function renderKnowledge() {
  knowledgeList.innerHTML = "";

  if (knowledge.length === 0) {
    knowledgeList.textContent = "Henüz kaydedilen bilgi yok.";
    return;
  }

  knowledge.forEach(item => {
    const div = document.createElement("div");
    div.className = "knowledge-item";

    const content = document.createElement("div");
    content.textContent = item.text;

    const remove = document.createElement("button");
    remove.textContent = "Sil";
    remove.className = "delete-knowledge";

    remove.addEventListener("click", () => {
      knowledge = knowledge.filter(k => k.id !== item.id);
      saveKnowledgeData();
      renderKnowledge();
    });

    div.append(content, remove);
    knowledgeList.appendChild(div);
  });
}

// SESLİ SOHBET

function startVoice() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Ses tanıma desteklenmiyor. Chrome kullanmayı deneyebilirsin.");
    return;
  }

  if (voiceMode) return;

  voiceMode = true;
  voicePage.classList.remove("hidden");

  setVoiceStatus(
    "Seni dinliyorum",
    "Konuşmaya başlayabilirsin",
    "listening"
  );

  startListening();
}

function startListening() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition || !voiceMode || busy || recognition) return;

  if ("speechSynthesis" in window &&
      window.speechSynthesis.speaking) return;

  recognition = new SpeechRecognition();
  recognition.lang = "tr-TR";
  recognition.continuous = false;
  recognition.interimResults = false;

  const currentRecognition = recognition;

  setVoiceStatus(
    "Seni dinliyorum",
    "Konuşabilirsin",
    "listening"
  );

  currentRecognition.onresult = event => {
    const text = event.results[0][0].transcript;

    if (text.trim()) {
      sendMessage(text, true);
    }
  };

  currentRecognition.onerror = event => {
    if (event.error === "not-allowed" ||
        event.error === "service-not-allowed") {
      alert("Mikrofon izni vermen gerekiyor.");
      closeVoice();
    } else if (event.error !== "no-speech" && voiceMode) {
      setVoiceStatus(
        "Dinleme hatası",
        "Tekrar konuşabilirsin",
        ""
      );
    }
  };

  currentRecognition.onend = () => {
    if (recognition === currentRecognition) {
      recognition = null;
    }

    if (voiceMode && !busy &&
        !window.speechSynthesis?.speaking) {
      setTimeout(() => {
        startListening();
      }, 400);
    }
  };

  try {
    currentRecognition.start();
  } catch (error) {
    recognition = null;
  }
}

function closeVoice() {
  voiceMode = false;

  if (recognition) {
    const oldRecognition = recognition;
    recognition = null;

    try {
      oldRecognition.stop();
    } catch (error) {}
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  voiceOrb.classList.remove("listening", "speaking");
  voicePage.classList.add("hidden");
}

voiceBtn.addEventListener("click", startVoice);
closeVoiceBtn.addEventListener("click", closeVoice);
voiceEndBtn.addEventListener("click", closeVoice);

// BAŞLANGIÇ

renderHistory();
renderKnowledge();
