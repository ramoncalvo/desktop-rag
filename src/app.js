// RAG App — https://github.com/ramoncalvo

const API = "http://127.0.0.1:5555/api";
let currentSessionId = null;
let sending = false;

// --- Helpers ---

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// --- Setup ---

const setupScreen = document.getElementById("setup-screen");
const mainScreen = document.getElementById("main-screen");
const setupStatus = document.getElementById("setup-status");
const setupDetail = document.getElementById("setup-detail");
const setupProgress = document.getElementById("setup-progress");
const setupBtn = document.getElementById("setup-btn");
const modelSelect = document.getElementById("model-select");

async function checkBackend() {
  for (let i = 0; i < 30; i++) {
    try {
      await api("/health");
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function initSetup() {
  setupProgress.classList.add("indeterminate");

  const backendOk = await checkBackend();
  if (!backendOk) {
    setupStatus.textContent = "No se pudo conectar al backend Python";
    setupDetail.textContent = "Asegurate de que Python esta instalado y backend/server.py corre en puerto 5555";
    setupProgress.classList.remove("indeterminate");
    return;
  }

  const status = await api("/ollama/status");
  setupProgress.classList.remove("indeterminate");

  if (!status.installed) {
    setupStatus.textContent = "Ollama no esta instalado";
    setupDetail.textContent = "Instala Ollama desde https://ollama.com";
    return;
  }

  if (status.saved_model && status.running && status.models.some(m => m.startsWith(status.saved_model.split(":")[0]))) {
    showMain(status.saved_model);
    return;
  }

  if (status.running) {
    setupStatus.textContent = "Ollama esta corriendo";
    if (status.models.length) {
      setupDetail.textContent = `Modelos locales: ${status.models.join(", ")}`;
    }
  } else {
    setupStatus.textContent = "Ollama instalado pero no esta corriendo";
    setupDetail.textContent = "Presiona 'Iniciar' para arrancar Ollama y descargar el modelo";
  }
}

setupBtn.addEventListener("click", async () => {
  setupBtn.disabled = true;
  modelSelect.disabled = true;
  const model = modelSelect.value;
  setupProgress.classList.add("indeterminate");

  try {
    const status = await api("/ollama/status");
    if (!status.running) {
      setupStatus.textContent = "Iniciando Ollama...";
      await api("/ollama/start", { method: "POST" });
    }

    setupStatus.textContent = `Preparando modelo ${model}...`;
    await api("/ollama/pull", {
      method: "POST",
      body: JSON.stringify({ model }),
    });

    setupStatus.textContent = `Modelo ${model} listo`;
    setupProgress.classList.remove("indeterminate");
    setupProgress.style.width = "100%";
    setTimeout(() => showMain(model), 500);
  } catch (e) {
    setupStatus.textContent = `Error: ${e.message}`;
    setupProgress.classList.remove("indeterminate");
    setupBtn.disabled = false;
    modelSelect.disabled = false;
  }
});

// --- Main ---

function showMain(model) {
  setupScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
  document.getElementById("status-text").textContent = `Modelo: ${model}`;
  loadSessions();
  loadFiles();
}

// --- Tabs ---

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// --- Sessions ---

const sessionsList = document.getElementById("sessions-list");

async function loadSessions() {
  const sessions = await api("/sessions");
  sessionsList.innerHTML = "";
  sessions.forEach((s) => {
    const li = document.createElement("li");
    li.dataset.id = s.id;
    if (s.id === currentSessionId) li.classList.add("active");

    const titleSpan = document.createElement("span");
    titleSpan.textContent = s.title;
    titleSpan.style.overflow = "hidden";
    titleSpan.style.textOverflow = "ellipsis";
    li.appendChild(titleSpan);

    const delBtn = document.createElement("span");
    delBtn.className = "delete-session";
    delBtn.textContent = "x";
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await api(`/sessions/${s.id}`, { method: "DELETE" });
      if (currentSessionId === s.id) {
        currentSessionId = null;
        document.getElementById("messages").innerHTML = "";
      }
      loadSessions();
    });
    li.appendChild(delBtn);

    li.addEventListener("click", () => {
      currentSessionId = s.id;
      loadMessages(s.id);
      loadSessions();
    });
    sessionsList.appendChild(li);
  });
}

document.getElementById("new-session-btn").addEventListener("click", () => {
  currentSessionId = null;
  document.getElementById("messages").innerHTML = "";
  loadSessions();
});

// --- Messages ---

const messagesDiv = document.getElementById("messages");

async function loadMessages(sessionId) {
  const messages = await api(`/sessions/${sessionId}/messages`);
  messagesDiv.innerHTML = "";
  messages.forEach(renderMessage);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = `message ${msg.role}`;

  let html = msg.content.replace(/\n/g, "<br>");

  // Sources
  if (msg.sources) {
    let sources;
    try {
      sources = typeof msg.sources === "string" ? JSON.parse(msg.sources) : msg.sources;
    } catch { sources = []; }

    if (sources.length) {
      const seen = new Set();
      const tags = [];
      sources.forEach((src) => {
        if (seen.has(src.file_id)) return;
        seen.add(src.file_id);
        const title = src.title || "";
        if (src.source_type === "video") {
          const timestamps = sources
            .filter((s) => s.file_id === src.file_id)
            .map((s) => s.start_ts || `${s.start_min}min`);
          tags.push(`<span>${title} (${timestamps.join(", ")})</span>`);
        } else if (src.source_type === "pdf") {
          const pages = [...new Set(sources.filter(s => s.file_id === src.file_id).map(s => s.page))].sort((a,b) => a-b);
          tags.push(`<span>${title} p.${pages.join(", ")}</span>`);
        } else {
          tags.push(`<span>${title}</span>`);
        }
      });
      html += `<div class="sources">${tags.join("")}</div>`;
    }
  }

  div.innerHTML = html;
  messagesDiv.appendChild(div);
}

// --- Send message ---

const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const cancelBtn = document.getElementById("cancel-btn");

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

let abortController = null;

async function sendMessage() {
  if (sending) return;
  const text = chatInput.value.trim();
  if (!text) return;

  sending = true;
  sendBtn.disabled = true;
  cancelBtn.disabled = false;
  chatInput.value = "";
  abortController = new AbortController();

  // Create session if needed
  if (!currentSessionId) {
    const session = await api("/sessions", {
      method: "POST",
      body: JSON.stringify({ title: text.slice(0, 80) }),
    });
    currentSessionId = session.id;
    loadSessions();
  }

  // Show user message
  renderMessage({ role: "user", content: text });

  // Show thinking
  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "thinking";
  thinkingDiv.textContent = "Pensando...";
  messagesDiv.appendChild(thinkingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    const response = await api(`/sessions/${currentSessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: text }),
      signal: abortController.signal,
    });

    thinkingDiv.remove();
    renderMessage(response);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    loadSessions();
  } catch (e) {
    thinkingDiv.remove();
    if (e.name !== "AbortError") {
      renderMessage({ role: "assistant", content: `Error: ${e.message}` });
    }
  }

  sending = false;
  sendBtn.disabled = false;
  cancelBtn.disabled = true;
  abortController = null;
}

cancelBtn.addEventListener("click", () => {
  if (abortController) abortController.abort();
  sending = false;
  sendBtn.disabled = false;
  cancelBtn.disabled = true;
});

// --- Indexer ---

const folderPath = document.getElementById("folder-path");
const browseBtn = document.getElementById("browse-btn");
const indexBtn = document.getElementById("index-btn");
const indexStatus = document.getElementById("index-status");
const filesBody = document.getElementById("files-body");

browseBtn.addEventListener("click", async () => {
  // Use Tauri dialog if available, otherwise prompt
  if (window.__TAURI__) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (selected) folderPath.value = selected;
    } catch {
      folderPath.value = prompt("Ruta de la carpeta:") || "";
    }
  } else {
    folderPath.value = prompt("Ruta de la carpeta:") || "";
  }
});

indexBtn.addEventListener("click", async () => {
  const folder = folderPath.value.trim();
  if (!folder) {
    indexStatus.textContent = "Selecciona una carpeta primero";
    return;
  }

  indexBtn.disabled = true;
  indexStatus.textContent = "Indexando...";

  try {
    const result = await api("/index", {
      method: "POST",
      body: JSON.stringify({ folder_path: folder }),
    });
    indexStatus.textContent = `Completado: ${result.new_indexed} nuevos de ${result.total_found} archivos encontrados`;
    loadFiles();
  } catch (e) {
    indexStatus.textContent = `Error: ${e.message}`;
  }
  indexBtn.disabled = false;
});

async function loadFiles() {
  try {
    const files = await api("/files");
    filesBody.innerHTML = "";
    files.forEach((f) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.title || f.file_name}</td>
        <td>${f.file_type}</td>
        <td>${f.chunk_count}</td>
        <td><button class="btn small danger" data-id="${f.id}">Eliminar</button></td>
      `;
      tr.querySelector("button").addEventListener("click", async () => {
        await api(`/files/${f.id}`, { method: "DELETE" });
        loadFiles();
      });
      filesBody.appendChild(tr);
    });

    // Load saved folder
    const setting = await api("/settings/index_folder");
    if (setting.value) folderPath.value = setting.value;
  } catch {}
}

// --- Init ---
initSetup();
