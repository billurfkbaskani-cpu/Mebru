
const API_URL = "https://mebru-1.onrender.com/api/chat";

// HTML ELEMENTLERİ
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

const voicePage = document.getElementById("voicePage");
const voiceOrb = document.getElementById("voiceOrb");
const voiceStatus = document.getElementById("voiceStatus");
const voiceSubtitle = document.getElementById("voiceSubtitle");

const closeVoiceBtn = document.getElementById("closeVoiceBtn");
const voiceEndBtn = document.getElementById("voiceEndBtn");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const newChatBtn = document.getElementById("newChatBtn");
const chatHistory = document.getElementById("chatHistory");

// ESKİ BİLGİLERİ KORUMA
let knowledge = JSON.parse(
  localStorage.getItem("mebru_knowledge") || "[]"
);

// SOHBETLER
let chats = JSON.parse(
  localStorage.getItem("mebru_chats") || "null"
);

let history = [];
let currentChatId = null;

// Eski sürümdeki sohbetleri yeni sisteme aktar.
if (!Array.isArray(chats)) {
  const oldHistory = JSON.parse(
    localStorage.getItem("mebru_history") || "[]"
  );

  chats = [];

  if (oldHistory.length > 0) {
    chats.push({
      id: Date.now(),
      title: "Eski sohbet",
      messages: oldHistory,
      updatedAt: Date.now()
    });
  }
}

if (chats.length > 0) {
  chats.sort((a, b) => b.updatedAt - a.updatedAt);
  currentChatId = chats[0].id;
  history = [...chats[0].messages];
}

let recognition = null;
let busy = false;
let voiceMode = false;

// KAYDETME
function saveChats() {
  localStorage.setItem("mebru_chats", JSON.stringify(chats));
}

function saveKnowledgeData() {
  localStorage.setItem(
    "mebru_knowledge",
    JSON.stringify(knowledge)
  );
}

// SOHBET BAŞLIĞI
function createChatTitle(text) {
  const title = text.trim().replace(/\s+/g, " ");
  return title.length > 28
    ? title.substring(0, 28) + "..."
    : title;
}

// SOHBETİ KAYDET
function saveHistory() {
  if (history.length === 0) return;

  let chat = chats.find(item => item.id === currentChatId);

  if (!chat) {
    currentChatId = Date.now();

    chat = {
      id: currentChatId,
      title: createChatTitle(
        history.find(item => item.role === "user")?.content || "Yeni sohbet"
      ),
      messages: [],
      updatedAt: Date.now()
    };

    chats.unshift(chat);
  }

  chat.messages = [...history];
  chat.updatedAt = Date.now();

  chats.sort((a, b) => b.updatedAt - a.updatedAt);

  saveChats();
  renderChatHistory();
}

// MESAJ EKLE
function addMessage(text, type) {
  const div = document.createElement("div");

  div.className = "message " + type;
  div.textContent = text;

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;

  return div;
}

// KARŞILAMA EKRANI
function showWelcome() {
  chatArea.innerHTML = `
    <div class="welcome">
      <div class="big-logo">M</div>
      <h1>MEBRU AI</h1>
      <p>Merhaba! Sana nasıl yardımcı olabilirim?</p>
    </div>
  `;
}

// SOHBETİ GÖSTER
function renderHistory() {
  chatArea.innerHTML = "";

  if (history.length === 0) {
    showWelcome();
    return;
  }

  history.forEach(item => {
    addMessage(
      item.content,
      item.role === "user" ? "user" : "ai"
    );
  });
}

// SOL MENÜDE SOHBETLERİ GÖSTER
function renderChatHistory() {
  chatHistory.innerHTML = "";

  if (chats.length === 0) {
    chatHistory.innerHTML =
      '<p class="empty-history">Henüz sohbet yok</p>';
    return;
  }

  chats.forEach(chat => {
    const item = document.createElement("button");

    item.className = "history-item";

    if (chat.id === currentChatId) {
      item.classList.add("selected");
    }

    item.textContent = chat.title;
    item.dataset.id = chat.id;

    item.addEventListener("click", () => {
      openChat(chat.id);
    });

    chatHistory.appendChild(item);
  });
}

// SOHBET AÇ
function openChat(id) {
  const chat = chats.find(item => item.id === id);

  if (!chat) return;

  currentChatId = chat.id;
  history = [...chat.messages];

  renderHistory();
  renderChatHistory();
  closeSidebar();
}

// YENİ SOHBET
function newChat() {
  if (busy) return;

  currentChatId = null;
  history = [];

  renderHistory();
  renderChatHistory();

  messageInput.value = "";
  messageInput.style.height = "46px";

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  closeSidebar();
}

// MENÜ AÇMA VE KAPATMA
function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("show");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");
}

menuBtn.addEventListener("click", openSidebar);

closeSidebarBtn.addEventListener("click", closeSidebar);

sidebarOverlay.addEventListener("click", closeSidebar);

newChatBtn.addEventListener("click", newChat);

// SES DURUMU
function setVoiceStatus(status, subtitle, animation) {
  voiceStatus.textContent = status;
  voiceSubtitle.textContent = subtitle;

  voiceOrb.classList.remove("listening", "speaking");

  if (animation) {
    voiceOrb.classList.add(animation);
  }
}

// MESAJ GÖNDER
async function sendMessage(text, voiceReply = false) {
  text = text.trim();

  if (!text || busy) return;

  busy = true;
  sendBtn.disabled = true;

  messageInput.value = "";
  messageInput.style.height = "46px";

  if (history.length === 0) {
    chatArea.innerHTML = "";
  }

  history.push({
    role: "user",
    content: text
  });

  addMessage(text, "user");

  saveHistory();

  const loading = addMessage(
    "MEBRU düşünüyor...",
    "ai"
  );

  if (voiceReply) {
    setVoiceStatus(
      "MEBRU düşünüyor",
      "Cevabını hazırlıyor...",
      ""
    );
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
        "Sunucu geçerli cevap vermedi: " +
        rawText.substring(0, 150)
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || "Sunucu hatası: " + response.status
      );
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
      setVoiceStatus(
        "Bir hata oluştu",
        "Tekrar deneyebilirsin",
        ""
      );
    }

  } finally {
    busy = false;
    sendBtn.disabled = false;
    chatArea.scrollTop = chatArea.scrollHeight;

    if (
      voiceReply &&
      voiceMode &&
      !window.speechSynthesis?.speaking
    ) {
      startListening();
    }
  }
}

// SESLİ OKUMA
function speak(text) {
  if (!("speechSynthesis" in window)) {
    setVoiceStatus(
      "Ses desteklenmiyor",
      "Tarayıcını kontrol et",
      ""
    );
    return;
  }

  const spokenText = text
    .replace(/\bMEBRU\s*AI\b/gi, "Mebru ey-ay")
    .replace(/\bMEBRU\b/gi, "Mebru");

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(spokenText);

  utterance.lang = "tr-TR";
  utterance.rate = 0.95;
  utterance.pitch = 1.05;

  setVoiceStatus(
    "MEBRU konuşuyor",
    "Cevabını dinle",
    "speaking"
  );

  utterance.onend = () => {
    if (voiceMode) startListening();
  };

  utterance.onerror = () => {
    if (voiceMode) startListening();
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
  messageInput.style.height = "46px";

  messageInput.style.height =
    Math.min(messageInput.scrollHeight, 150) + "px";
});

// SESLİ SOHBETİ BAŞLAT
function startVoice() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert(
      "Ses tanıma desteklenmiyor. Chrome kullanmayı deneyebilirsin."
    );
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

// SESİ DİNLE
function startListening() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (
    !SpeechRecognition ||
    !voiceMode ||
    busy ||
    recognition
  ) return;

  if (
    "speechSynthesis" in window &&
    window.speechSynthesis.speaking
  ) return;

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
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      alert("Mikrofon izni vermen gerekiyor.");
      closeVoice();
    } else if (
      event.error !== "no-speech" &&
      voiceMode
    ) {
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

    if (
      voiceMode &&
      !busy &&
      !window.speechSynthesis?.speaking
    ) {
      setTimeout(() => {
        startListening();
      }, 500);
    }
  };

  try {
    currentRecognition.start();
  } catch (error) {
    recognition = null;
  }
}

// SESLİ SOHBETİ KAPAT
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
renderChatHistory();
  
