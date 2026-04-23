window.CARA = window.CARA || {};

(() => {
  function resolveBase() {
    if (typeof window.resolveCaraApiBaseUrl === 'function') return window.resolveCaraApiBaseUrl();
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return `${protocol}//${hostname}:4000`;
    return '';
  }
  const API_BASE = window.CARA_CONFIG?.apiBase || resolveBase();

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`API error ${response.status}: ${message || "Unknown error"}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    return response.text();
  }

  function getTriage(payload) {
    return request("/api/triage/assess", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function getImpact(range = "month") {
    return request(`/api/analytics/impact?range=${encodeURIComponent(range)}`);
  }

  function saveFollowUp(payload) {
    return request("/api/followup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function askAssistant(payload) {
    return request("/api/assistant", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function submitJoinUs(payload) {
    return request("/public/join-us", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  window.CARA.api = {
    request,
    getTriage,
    getImpact,
    saveFollowUp,
    askAssistant,
    submitJoinUs,
  };
})();
(function attachCaraApi(globalScope) {
  // ── Backend URL Resolution ──────────────────────────────
  // Priority: CARA_CONFIG.apiBase → known production mapping → localhost
  const PRODUCTION_API_MAP = {
    'cara-eta-eosin.vercel.app': 'https://cara-backend.onrender.com',
  };

  function resolveCaraApiBaseUrl() {
    if (globalScope.CARA_CONFIG?.apiBase) return globalScope.CARA_CONFIG.apiBase;
    const { protocol, hostname } = globalScope.location;
    if (PRODUCTION_API_MAP[hostname]) return PRODUCTION_API_MAP[hostname];
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:4000`;
    }
    return '';
  }

  class CaraApi {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl ?? resolveCaraApiBaseUrl();
      this.tokenProvider = options.tokenProvider || null;
    }

    async request(path, options = {}) {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

      let token = null;
      if (typeof this.tokenProvider === 'function') {
        token = await this.tokenProvider();
      } else if (globalScope.CaraAuth && typeof globalScope.CaraAuth.getAccessToken === 'function') {
        token = await globalScope.CaraAuth.getAccessToken();
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
      }

      return data;
    }

    assessTriage(payload) {
      return this.request('/api/triage/assess', {
        method: 'POST',
        body: payload,
      });
    }

    listPatients() {
      return this.request('/api/patients');
    }

    createPatient(payload) {
      return this.request('/api/patients', {
        method: 'POST',
        body: payload,
      });
    }

    updatePatient(patientId, payload) {
      return this.request(`/api/patients/${encodeURIComponent(patientId)}`, {
        method: 'PUT',
        body: payload,
      });
    }

    deletePatient(patientId) {
      return this.request(`/api/patients/${encodeURIComponent(patientId)}`, {
        method: 'DELETE',
      });
    }

    generateNote(payload) {
      return this.request('/api/notes/generate', {
        method: 'POST',
        body: payload,
      });
    }

    listNotes(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/notes${suffix}`);
    }

    getDashboardOverview(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/dashboard/overview${suffix}`);
    }

    getTriageQueue(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/triage/queue${suffix}`);
    }

    getImpactAnalytics(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/analytics/impact${suffix}`);
    }

    getCurrentPatientSummary(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/patients/me/summary${suffix}`);
    }

    listFollowups(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/followup${suffix}`);
    }

    createFollowup(payload) {
      return this.request('/api/followup', {
        method: 'POST',
        body: payload,
      });
    }

    askAssistant(payload) {
      return this.request('/api/assistant', {
        method: 'POST',
        body: payload,
      });
    }

    listAssistantLogs(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/assistant/logs${suffix}`);
    }

    // ─── Readmission ──────────────────────────────────

    predictReadmission(payload) {
      return this.request('/api/readmission/predict', {
        method: 'POST',
        body: payload,
      });
    }

    listReadmissionRecords(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/readmission${suffix}`);
    }

    // ─── Voice ────────────────────────────────────────

    transcribeAudio(formData) {
      // Special handling — FormData, not JSON
      return fetch(`${this.baseUrl}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
      }).then((r) => r.json());
    }

    // ─── RAG ──────────────────────────────────────────

    getRagIndexStatus() {
      return this.request('/api/rag/index/status');
    }

    buildRagIndex(payload = {}) {
      return this.request('/api/rag/index/build', {
        method: 'POST',
        body: payload,
      });
    }

    queryRag(payload) {
      return this.request('/api/rag/query', {
        method: 'POST',
        body: payload,
      });
    }

    // ─── Audit ────────────────────────────────────────

    listAuditEvents(query = {}) {
      const search = new URLSearchParams(query).toString();
      const suffix = search ? `?${search}` : '';
      return this.request(`/api/audit${suffix}`);
    }

    // ─── Sync ─────────────────────────────────────────

    getSyncStatus() {
      return this.request('/api/sync-status');
    }

    // ─── Patient Summary (single) ─────────────────────

    getPatientSummary(patientId) {
      return this.request(`/api/patients/${encodeURIComponent(patientId)}/summary`);
    }

    submitJoinUs(payload) {
      return this.request('/public/join-us', {
        method: 'POST',
        body: payload,
      });
    }
  }

  globalScope.CaraApi = CaraApi;
  globalScope.resolveCaraApiBaseUrl = resolveCaraApiBaseUrl;
})(window);
