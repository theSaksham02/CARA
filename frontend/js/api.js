(function attachCaraApi(globalScope) {
  class CaraApi {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || '';
      this.tokenProvider = options.tokenProvider || null;
    }

    async request(path, options = {}) {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

      if (typeof this.tokenProvider === 'function') {
        const token = await this.tokenProvider();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
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
