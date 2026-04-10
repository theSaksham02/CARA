window.CARA = window.CARA || {};

(() => {
  const API_BASE = window.CARA_CONFIG?.apiBase || "";

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
    return request("/api/triage", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function getImpact(range = "month") {
    return request(`/api/impact?range=${encodeURIComponent(range)}`);
  }

  function saveFollowUp(payload) {
    return request("/api/followups", {
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

  window.CARA.api = {
    request,
    getTriage,
    getImpact,
    saveFollowUp,
    askAssistant,
  };
})();
(function attachCaraApi(globalScope) {
  class CaraApi {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || 'http://localhost:4000';
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
  }

  globalScope.CaraApi = CaraApi;
})(window);
