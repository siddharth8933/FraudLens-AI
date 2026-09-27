const API = import.meta.env.VITE_API_URL || "";

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return { detail: text }; }
}

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${API}${path}`, { ...options, signal: controller.signal });
    const data = await parseResponse(res);
    if (!res.ok) throw new Error(data.detail || data.message || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Server did not respond within 30 seconds. Keep the backend window running and try again.");
    }
    if (err instanceof TypeError) {
      throw new Error("Cannot connect to the backend. Start the FraudLens backend and keep its CMD window open.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeDocument(formData) {
  return request("/api/screen/analyze", { method: "POST", body: formData });
}

export async function analyzeLiveFrame(blob) {
  const fd = new FormData();
  fd.append("frame", blob, "camera.jpg");
  return request("/api/screen/live-frame", { method: "POST", body: fd });
}

export async function matchLiveFace(documentFile, liveBlob) {
  const fd = new FormData();
  fd.append("document", documentFile, documentFile.name || "document.jpg");
  fd.append("live_face", liveBlob, "live-face.jpg");
  return request("/api/screen/live-match", { method: "POST", body: fd });
}

export async function health() {
  return request("/api/health");
}

export async function signup(email, password) {
  return request("/api/auth/signup", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, password})
  });
}

export async function login(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, password})
  });
}

export async function history() {
  return request("/api/screen/history");
}
