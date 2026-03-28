// RAG App — https://github.com/ramoncalvo

const API = "http://127.0.0.1:5555/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// --- Types ---

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  models: string[];
  saved_model: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: string | null;
  actions: string | null;
  created_at: string;
}

export interface Source {
  file_id: string;
  title: string;
  start_min: number;
  end_min: number;
  file_path: string;
  snippet: string;
  source_type: string;
  page?: number;
  start_ts?: string;
  end_ts?: string;
}

export interface IndexedFile {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  title: string;
  chunk_count: number;
  page_count: number;
  duration_sec: number;
  created_at: string;
}

export interface IndexResult {
  total_found: number;
  new_indexed: number;
  files: { file_id: string; title: string; type: string; chunks: number }[];
}

// --- API ---

export const api = {
  health: () => request<{ status: string }>("/health"),

  ollama: {
    status: () => request<OllamaStatus>("/ollama/status"),
    start: () => request<{ ok: boolean }>("/ollama/start", { method: "POST" }),
    pull: (model: string) =>
      request<{ ok: boolean }>("/ollama/pull", {
        method: "POST",
        body: JSON.stringify({ model }),
      }),
  },

  sessions: {
    list: () => request<Session[]>("/sessions"),
    create: (title?: string) =>
      request<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    rename: (id: string, title: string) =>
      request<{ ok: boolean }>(`/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" }),
    messages: (id: string) => request<Message[]>(`/sessions/${id}/messages`),
    send: (id: string, content: string) =>
      request<Message>(`/sessions/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  },

  files: {
    list: () => request<IndexedFile[]>("/files"),
    index: (folder_path: string) =>
      request<IndexResult>("/index", {
        method: "POST",
        body: JSON.stringify({ folder_path }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/files/${id}`, { method: "DELETE" }),
  },

  settings: {
    get: (key: string) =>
      request<{ key: string; value: string }>(`/settings/${key}`),
  },
};
