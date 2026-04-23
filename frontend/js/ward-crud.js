/**
 * ward-crud.js — Full CRUD operations for The Ward (Clinician Portal)
 *
 * Replaces all static patient data with live Supabase / backend data.
 * Adds:
 *   - Add New Patient modal
 *   - Inline Edit patient modal  
 *   - Delete patient with confirmation
 *   - Live queue row click → slide-in detail panel
 *   - Edit SOAP note sections inline
 *   - Overview KPIs & queue auto-refresh every 30s
 */
(function attachWardCrud(globalScope) {
  'use strict';

  const path = (globalScope.location.pathname.split('/').pop() || '').toLowerCase();
  const ACTIVE_PATIENT_KEY = 'cara-active-patient-id';

  function getApiBaseUrl() {
    if (typeof globalScope.resolveCaraApiBaseUrl === 'function') {
      return globalScope.resolveCaraApiBaseUrl();
    }
    const { protocol, hostname } = globalScope.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:4000`;
    }
    return '';
  }

  function createApi() {
    if (globalScope.CaraApi) {
      return new globalScope.CaraApi({ baseUrl: getApiBaseUrl() });
    }
    return null;
  }

  function getActivePatientId() {
    const params = new URLSearchParams(globalScope.location.search || '');
    const queryPatientId = params.get('patient_id');
    if (queryPatientId) {
      return queryPatientId;
    }
    return globalScope.sessionStorage.getItem(ACTIVE_PATIENT_KEY);
  }

  function setActivePatientId(patientId) {
    if (!patientId) return;
    globalScope.sessionStorage.setItem(ACTIVE_PATIENT_KEY, patientId);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatAgeMonths(ageMonths) {
    if (typeof ageMonths !== 'number' || Number.isNaN(ageMonths)) return 'Unknown';
    if (ageMonths >= 12) return `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m`;
    return `${ageMonths}m`;
  }

  function urgencyTone(urgency) {
    if (urgency === 'RED') return 'bg-error-container text-on-error-container';
    if (urgency === 'YELLOW') return 'bg-secondary-container text-on-secondary-container';
    return 'bg-primary-fixed text-on-primary-fixed';
  }

  function urgencyLabel(urgency) {
    if (urgency === 'RED') return 'Critical';
    if (urgency === 'YELLOW') return 'Urgent';
    return 'Stable';
  }

  // ═══════════════════════════════════════════
  // Modal Utilities
  // ═══════════════════════════════════════════

  function createModalOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm';
    overlay.style.animation = 'fadeIn 150ms ease-out';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    return overlay;
  }

  function createModalCard(title) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden';
    card.style.animation = 'slideUp 200ms ease-out';
    card.innerHTML = `
      <div class="px-8 pt-8 pb-4 border-b border-stone-100">
        <h2 class="text-2xl font-['Newsreader'] font-bold text-stone-900">${escapeHtml(title)}</h2>
      </div>
      <div data-modal-body class="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto"></div>
      <div data-modal-footer class="px-8 py-4 border-t border-stone-100 flex justify-end gap-3 bg-stone-50"></div>
    `;
    return card;
  }

  function addField(container, label, name, value, type = 'text', options = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'space-y-1';
    const labelEl = document.createElement('label');
    labelEl.className = 'block text-sm font-bold text-stone-600 uppercase tracking-wider';
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);

    if (options) {
      const select = document.createElement('select');
      select.name = name;
      select.className = 'w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';
      options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === value) o.selected = true;
        select.appendChild(o);
      });
      wrapper.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = type;
      input.name = name;
      input.value = value || '';
      input.className = 'w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';
      wrapper.appendChild(input);
    }

    container.appendChild(wrapper);
  }

  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `fixed top-6 right-6 z-[200] px-6 py-3 rounded-xl shadow-lg text-sm font-bold transition-all ${
      isError ? 'bg-red-600 text-white' : 'bg-primary-container text-on-primary-container'
    }`;
    toast.textContent = message;
    toast.style.animation = 'slideUp 200ms ease-out';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  // ═══════════════════════════════════════════
  // Add Patient Modal
  // ═══════════════════════════════════════════

  function showAddPatientModal(api, onDone) {
    const overlay = createModalOverlay();
    const card = createModalCard('Add New Patient');
    const body = card.querySelector('[data-modal-body]');
    const footer = card.querySelector('[data-modal-footer]');

    addField(body, 'Full Name *', 'full_name', '');
    addField(body, 'Age (months) *', 'age_months', '', 'number');
    addField(body, 'Sex', 'sex', '', 'text', [
      { value: '', label: 'Select…' },
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
    ]);
    addField(body, 'Village', 'village', '');
    addField(body, 'Caregiver Name', 'caregiver_name', '');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'px-6 py-2.5 rounded-full border border-stone-200 text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20';
    saveBtn.textContent = 'Add Patient';
    saveBtn.onclick = async () => {
      const data = {};
      body.querySelectorAll('input, select').forEach((el) => {
        if (el.value) data[el.name] = el.name === 'age_months' ? Number(el.value) : el.value;
      });

      if (!data.full_name || !data.age_months) {
        showToast('Name and age are required.', true);
        return;
      }

      saveBtn.textContent = 'Saving…';
      saveBtn.disabled = true;

      try {
        const response = await api.createPatient(data);
        setActivePatientId(response.patient?.id || null);
        showToast('Patient added successfully.');
        overlay.remove();
        if (onDone) onDone();
      } catch (err) {
        showToast(err.message || 'Failed to create patient.', true);
        saveBtn.textContent = 'Add Patient';
        saveBtn.disabled = false;
      }
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ═══════════════════════════════════════════
  // Edit Patient Modal
  // ═══════════════════════════════════════════

  function showEditPatientModal(api, patient, onDone) {
    const overlay = createModalOverlay();
    const card = createModalCard('Edit Patient');
    const body = card.querySelector('[data-modal-body]');
    const footer = card.querySelector('[data-modal-footer]');

    addField(body, 'Full Name', 'full_name', patient.full_name);
    addField(body, 'Age (months)', 'age_months', patient.age_months, 'number');
    addField(body, 'Sex', 'sex', patient.sex || '', 'text', [
      { value: '', label: 'Select…' },
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
    ]);
    addField(body, 'Village', 'village', patient.village || '');
    addField(body, 'Caregiver Name', 'caregiver_name', patient.caregiver_name || '');

    // ID badge
    const badge = document.createElement('div');
    badge.className = 'text-xs text-stone-400 mt-2';
    badge.textContent = `ID: ${patient.id}`;
    body.appendChild(badge);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'px-6 py-2.5 rounded-full border border-stone-200 text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20';
    saveBtn.textContent = 'Save Changes';
    saveBtn.onclick = async () => {
      const data = {};
      body.querySelectorAll('input, select').forEach((el) => {
        data[el.name] = el.name === 'age_months' ? Number(el.value) : el.value;
      });

      saveBtn.textContent = 'Saving…';
      saveBtn.disabled = true;

      try {
        await api.updatePatient(patient.id, data);
        setActivePatientId(patient.id);
        showToast('Patient updated successfully.');
        overlay.remove();
        if (onDone) onDone();
      } catch (err) {
        showToast(err.message || 'Failed to update patient.', true);
        saveBtn.textContent = 'Save Changes';
        saveBtn.disabled = false;
      }
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ═══════════════════════════════════════════
  // Delete Patient Confirmation
  // ═══════════════════════════════════════════

  function showDeleteConfirmation(api, patient, onDone) {
    const overlay = createModalOverlay();
    const card = createModalCard('Delete Patient');
    const body = card.querySelector('[data-modal-body]');
    const footer = card.querySelector('[data-modal-footer]');

    body.innerHTML = `
      <div class="flex items-start gap-4 p-4 bg-red-50 rounded-xl">
        <span class="material-symbols-outlined text-red-600 text-2xl">warning</span>
        <div>
          <p class="font-bold text-red-700 text-lg">${escapeHtml(patient.full_name)}</p>
          <p class="text-sm text-red-600 mt-1">
            This action will permanently delete this patient AND all their associated triage assessments, SOAP notes, follow-ups, and readmission records. This cannot be undone.
          </p>
        </div>
      </div>
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'px-6 py-2.5 rounded-full border border-stone-200 text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => overlay.remove();

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'px-6 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors';
    deleteBtn.textContent = 'Delete Patient';
    deleteBtn.onclick = async () => {
      deleteBtn.textContent = 'Deleting…';
      deleteBtn.disabled = true;

      try {
        await api.deletePatient(patient.id);
        if (getActivePatientId() === patient.id) {
          globalScope.sessionStorage.removeItem(ACTIVE_PATIENT_KEY);
        }
        showToast('Patient deleted.');
        overlay.remove();
        if (onDone) onDone();
      } catch (err) {
        showToast(err.message || 'Failed to delete patient.', true);
        deleteBtn.textContent = 'Delete Patient';
        deleteBtn.disabled = false;
      }
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(deleteBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ═══════════════════════════════════════════
  // Overview Page — Live Dynamic Rendering
  // ═══════════════════════════════════════════

  async function bootOverview(api) {
    const main = document.querySelector('main');
    if (!main) return;

    async function load() {
      try {
        const [dashData, analyticsData, patientsData] = await Promise.all([
          api.getDashboardOverview().catch(() => ({ overview: { kpis: {}, high_urgency_cases: [] } })),
          api.getImpactAnalytics({ range: 'week' }).catch(() => ({ analytics: { metrics: {} } })),
          api.listPatients().catch(() => ({ patients: [] })),
        ]);

        const overview = dashData.overview || { kpis: {}, high_urgency_cases: [] };
        const analytics = analyticsData.analytics || { metrics: {} };
        const patients = patientsData.patients || [];
        const kpis = overview.kpis || {};
        const cases = overview.high_urgency_cases || [];

        // Update KPI numbers
        const kpiEls = main.querySelectorAll('.instrument-text');
        if (kpiEls.length >= 4) {
          kpiEls[0].textContent = String(kpis.patients_total ?? patients.length).padStart(2, '0');
          kpiEls[1].textContent = String(kpis.patients_triaged_today ?? cases.filter((c) => c.urgency === 'RED').length).padStart(2, '0');
          kpiEls[2].textContent = String(kpis.soap_notes_today ?? 0).padStart(2, '0');
          kpiEls[3].textContent = String(kpis.followups_due ?? 0).padStart(2, '0');
        }

        // Update greeting with live count
        const subtitle = main.querySelector('p.text-on-surface-variant');
        if (subtitle) {
          subtitle.textContent = `You have ${patients.length} patients in the system. ${cases.length} need urgent attention.`;
        }

        // Update patient queue table
        const tbody = main.querySelector('tbody');
        if (tbody && cases.length) {
          tbody.innerHTML = cases
            .map(
              (item) => `
            <tr class="group hover:bg-surface-container-low transition-colors">
              <td class="py-5"><span class="px-3 py-1 ${urgencyTone(item.urgency)} text-[10px] font-bold rounded-full uppercase">${escapeHtml(item.urgency)}</span></td>
              <td class="py-5 font-['Satoshi'] font-medium text-on-surface">${escapeHtml(item.patient_name)}</td>
              <td class="py-5 text-on-surface-variant">${escapeHtml(item.age_display || formatAgeMonths(item.age_months))}</td>
              <td class="py-5 text-on-surface-variant">${escapeHtml((item.symptoms || []).join(', ') || item.condition_label || item.reason || '—')}</td>
              <td class="py-5 text-on-surface-variant">${escapeHtml(item.triage_time_display || '—')}</td>
              <td class="py-5 text-right"><a class="text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity" href="the-ward-patient-queue.html">View →</a></td>
            </tr>
          `
            )
            .join('');
        }
      } catch (err) {
        console.warn('[ward-crud] overview load error:', err.message);
      }
    }

    await load();
    setInterval(load, 30000);
  }

  // ═══════════════════════════════════════════
  // Patient Queue Page — Full CRUD
  // ═══════════════════════════════════════════

  async function bootPatientQueue(api) {
    const main = document.querySelector('main');
    if (!main) return;

    let allPatients = [];
    let allQueue = [];
    let currentFilter = 'ALL';

    async function loadData() {
      try {
        const [patientsData, queueData] = await Promise.all([
          api.listPatients().catch(() => ({ patients: [] })),
          api.getTriageQueue().catch(() => ({ queue: [] })),
        ]);
        allPatients = patientsData.patients || [];
        allQueue = queueData.queue || [];
      } catch (_err) {
        // Keep existing data
      }
    }

    function renderQueue() {
      const container = main.querySelector('.bg-surface-container-lowest');
      if (!container) return;

      const mergedRows = allPatients.map((patient) => {
        const triageEntry = allQueue.find((q) => q.patient_id === patient.id);
        return {
          ...patient,
          urgency: triageEntry?.urgency || 'GREEN',
          symptoms: triageEntry?.symptoms || [],
          reason: triageEntry?.reason || '',
          recommended_action: triageEntry?.recommended_action || '',
          matched_rule_id: triageEntry?.matched_rule_id || '',
          triage_time: triageEntry?.triage_time || patient.created_at,
        };
      });

      // Sort: RED first, then YELLOW, then GREEN
      const priority = { RED: 0, YELLOW: 1, GREEN: 2 };
      mergedRows.sort((a, b) => (priority[a.urgency] ?? 2) - (priority[b.urgency] ?? 2));

      const filtered =
        currentFilter === 'ALL'
          ? mergedRows
          : mergedRows.filter((r) => r.urgency === currentFilter);

      const tbody = container.querySelector('tbody');
      if (!tbody) return;

      if (!filtered.length) {
        tbody.innerHTML = `
          <tr>
            <td class="px-6 py-10 text-sm text-on-surface-variant" colspan="7">
              No patients found. Click the <strong>+</strong> button to add your first patient.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered
        .map((item) => {
          const borderClass = item.urgency === 'RED' ? 'border-l-8 border-error/40' : item.urgency === 'YELLOW' ? 'border-l-8 border-tertiary/40' : '';
          return `
          <tr class="hover:bg-surface-container-low/50 transition-colors ${borderClass} group" data-patient-id="${escapeHtml(item.id)}">
            <td class="px-6 py-5">
              <span class="${urgencyTone(item.urgency)} px-3 py-1 rounded-full text-[10px] font-black uppercase">${escapeHtml(urgencyLabel(item.urgency))}</span>
            </td>
            <td class="px-6 py-5">
              <p class="font-bold text-on-surface">${escapeHtml(item.full_name)}</p>
              <p class="text-xs text-on-surface-variant">ID: ${escapeHtml(item.id.slice(0, 12))}…</p>
            </td>
            <td class="px-6 py-5 text-sm">${escapeHtml(formatAgeMonths(item.age_months))}</td>
            <td class="px-6 py-5 text-sm">${escapeHtml((item.symptoms || []).join(', ') || item.reason || '—')}</td>
            <td class="px-6 py-5">
              <span class="bg-surface-container-high px-2 py-1 rounded text-xs">${escapeHtml(item.matched_rule_id || '—')}</span>
            </td>
            <td class="px-6 py-5 text-sm font-medium ${item.urgency === 'RED' ? 'text-error' : 'text-on-surface-variant'}">${escapeHtml(item.sex || '—')} • ${escapeHtml(item.village || '—')}</td>
            <td class="px-6 py-5">
              <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors" title="Edit" data-action="edit" data-patient-id="${escapeHtml(item.id)}">
                  <span class="material-symbols-outlined text-sm">edit</span>
                </button>
                <button class="p-2 bg-surface-container text-on-surface rounded-lg hover:bg-surface-container-high transition-colors" title="View Record" data-action="view" data-patient-id="${escapeHtml(item.id)}">
                  <span class="material-symbols-outlined text-sm">visibility</span>
                </button>
                <button class="p-2 bg-error-container text-on-error-container rounded-lg hover:bg-error/20 transition-colors" title="Delete" data-action="delete" data-patient-id="${escapeHtml(item.id)}">
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
        })
        .join('');

      // Attach row action handlers
      tbody.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pid = btn.dataset.patientId;
          const patient = allPatients.find((p) => p.id === pid);
          if (!patient) return;

          if (btn.dataset.action === 'edit') {
            showEditPatientModal(api, patient, async () => {
              await loadData();
              renderQueue();
            });
          } else if (btn.dataset.action === 'delete') {
            showDeleteConfirmation(api, patient, async () => {
              await loadData();
              renderQueue();
              updateSidePanel(null);
            });
          } else if (btn.dataset.action === 'view') {
            const triageEntry = allQueue.find((q) => q.patient_id === pid);
            setActivePatientId(pid);
            updateSidePanel({ ...patient, ...(triageEntry || {}) });
          }
        });
      });

      // Click row to show in side panel
      tbody.querySelectorAll('tr[data-patient-id]').forEach((row) => {
        row.addEventListener('click', () => {
          const pid = row.dataset.patientId;
          const patient = allPatients.find((p) => p.id === pid);
          const triageEntry = allQueue.find((q) => q.patient_id === pid);
          setActivePatientId(pid);
          updateSidePanel({ ...patient, ...(triageEntry || {}) });
        });
      });
    }

    function updateSidePanel(item) {
      const aside = main.querySelector('aside.w-\\[400px\\]');
      if (!aside) return;

      if (!item) {
        aside.innerHTML = `
          <div class="p-6"><h3 class="font-headline text-2xl text-on-surface leading-tight">Select a patient</h3>
          <p class="text-sm text-on-surface-variant mt-2">Click any row in the queue to view details.</p>
          </div>`;
        return;
      }

      aside.innerHTML = `
        <div class="p-6 border-b border-surface-variant flex justify-between items-start">
          <div>
            <h3 class="font-headline text-2xl text-on-surface leading-tight">${escapeHtml(item.full_name)}</h3>
            <p class="text-sm text-on-surface-variant mt-1">${escapeHtml(formatAgeMonths(item.age_months))} • ${escapeHtml(item.sex || '—')} • ${escapeHtml(item.urgency || 'GREEN')}</p>
          </div>
          <button class="p-2 hover:bg-surface-variant rounded-full transition-colors" data-action="edit-panel">
            <span class="material-symbols-outlined text-lg">edit</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          <div>
            <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Village</h4>
            <div class="bg-surface-container-lowest p-4 rounded-lg text-sm">${escapeHtml(item.village || 'Not specified')}</div>
          </div>
          <div>
            <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Caregiver</h4>
            <div class="bg-surface-container-lowest p-4 rounded-lg text-sm">${escapeHtml(item.caregiver_name || 'Not specified')}</div>
          </div>
          ${
            item.reason
              ? `<div>
              <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Triage Reason</h4>
              <div class="bg-surface-container-lowest p-4 rounded-lg text-sm text-on-surface-variant leading-relaxed">${escapeHtml(item.reason)}</div>
            </div>`
              : ''
          }
          ${
            item.symptoms?.length
              ? `<div>
              <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Symptoms</h4>
              <div class="flex flex-wrap gap-2">${item.symptoms.map((s) => `<span class="bg-surface-container-lowest px-3 py-1 rounded-full text-xs font-bold">${escapeHtml(s)}</span>`).join('')}</div>
            </div>`
              : ''
          }
          ${
            item.recommended_action
              ? `<div>
              <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Recommended Action</h4>
              <div class="bg-primary/5 p-4 rounded-lg text-sm leading-relaxed">${escapeHtml(item.recommended_action)}</div>
            </div>`
              : ''
          }
        </div>
        <div class="p-6 bg-surface-container border-t border-surface-variant space-y-3">
          <button class="w-full py-3 bg-primary text-on-primary rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform" data-action="run-triage">
            <span class="material-symbols-outlined text-lg">assessment</span>
            Run Triage Assessment
          </button>
          <div class="grid grid-cols-2 gap-3">
            <button class="py-2.5 bg-surface-container-high text-on-surface rounded-full text-xs font-bold hover:bg-surface-variant transition-colors" data-action="edit-panel">
              Edit Patient
            </button>
            <button class="py-2.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold hover:opacity-90 transition-colors" data-action="schedule-followup">
              Schedule Follow-up
            </button>
          </div>
        </div>
      `;

      // Wire panel actions
      aside.querySelectorAll('[data-action="edit-panel"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const patient = allPatients.find((p) => p.id === item.id);
          if (patient) {
            showEditPatientModal(api, patient, async () => {
              await loadData();
              renderQueue();
              const updated = allPatients.find((p) => p.id === item.id);
              if (updated) updateSidePanel({ ...updated, ...(allQueue.find((q) => q.patient_id === item.id) || {}) });
            });
          }
        });
      });

      const runTriageBtn = aside.querySelector('[data-action="run-triage"]');
      if (runTriageBtn) {
        runTriageBtn.addEventListener('click', async () => {
          const symptomInput = globalScope.prompt(
            'Enter symptoms (comma separated):',
            (item.symptoms || []).join(', ')
          );
          if (!symptomInput) return;
          const symptoms = symptomInput
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
          if (!symptoms.length) {
            showToast('At least one symptom is required.', true);
            return;
          }

          runTriageBtn.disabled = true;
          runTriageBtn.textContent = 'Running…';
          try {
            await api.assessTriage({
              patient_id: item.id,
              age_months: Number(item.age_months || 0),
              symptoms,
            });
            setActivePatientId(item.id);
            showToast('Triage assessment saved.');
            await loadData();
            renderQueue();
            const updated = allPatients.find((p) => p.id === item.id);
            if (updated) {
              updateSidePanel({ ...updated, ...(allQueue.find((q) => q.patient_id === item.id) || {}) });
            }
          } catch (err) {
            showToast(err.message || 'Triage request failed.', true);
          } finally {
            runTriageBtn.disabled = false;
            runTriageBtn.innerHTML = '<span class="material-symbols-outlined text-lg">assessment</span>Run Triage Assessment';
          }
        });
      }

      const followupBtn = aside.querySelector('[data-action="schedule-followup"]');
      if (followupBtn) {
        followupBtn.addEventListener('click', async () => {
          const dueDate = globalScope.prompt('Enter follow-up date (YYYY-MM-DD):');
          if (!dueDate) return;
          const instructions = globalScope.prompt(
            'Enter follow-up instructions:',
            'Re-check symptoms and vitals.'
          );
          if (!instructions) return;

          followupBtn.disabled = true;
          followupBtn.textContent = 'Saving…';
          try {
            await api.createFollowup({
              patient_id: item.id,
              due_date: dueDate,
              instructions,
              urgency: item.urgency || 'YELLOW',
            });
            setActivePatientId(item.id);
            showToast('Follow-up scheduled.');
          } catch (err) {
            showToast(err.message || 'Could not schedule follow-up.', true);
          } finally {
            followupBtn.disabled = false;
            followupBtn.textContent = 'Schedule Follow-up';
          }
        });
      }
    }

    // Wire filter buttons
    const filterBtns = main.querySelectorAll('button');
    const filterLabels = ['All', 'RED', 'YELLOW', 'GREEN'];
    filterBtns.forEach((btn) => {
      const label = btn.textContent.trim();
      if (filterLabels.includes(label)) {
        btn.addEventListener('click', () => {
          currentFilter = label === 'All' ? 'ALL' : label;
          // Update active state
          filterBtns.forEach((b) => {
            if (filterLabels.includes(b.textContent.trim())) {
              b.className = b.className
                .replace('bg-primary text-on-primary', 'border border-outline-variant bg-surface-container-low text-on-surface-variant')
                .replace('border border-outline-variant bg-surface-container-low text-on-surface-variant', 'border border-outline-variant bg-surface-container-low text-on-surface-variant');
            }
          });
          btn.className = btn.className.replace('border border-outline-variant bg-surface-container-low text-on-surface-variant', 'bg-primary text-on-primary');
          renderQueue();
        });
      }
    });

    // Wire FAB (Add Patient)
    const fab = document.querySelector('button.fixed.bottom-8');
    if (fab) {
      fab.addEventListener('click', () => {
        showAddPatientModal(api, async () => {
          await loadData();
          renderQueue();
        });
      });
    }

    await loadData();
    renderQueue();

    // Auto-refresh
    setInterval(async () => {
      await loadData();
      renderQueue();
    }, 30000);
  }

  // ═══════════════════════════════════════════
  // AI Assistant Page — Live Health Alerts
  // ═══════════════════════════════════════════

  async function bootAiAssistant(api) {
    const aside = document.querySelector('aside.w-\\[380px\\]');
    if (!aside) return;

    // Target the Live Health Alerts section
    const alertsHeading = aside.querySelector('h3');
    const alertsSection = Array.from(aside.querySelectorAll('div > h3')).find(
      (h) => h.textContent.trim() === 'Live Health Alerts'
    );
    const alertsContainer = alertsSection ? alertsSection.parentElement : null;

    async function loadAlerts() {
      try {
        const [queueData, patientsData, analyticsData] = await Promise.all([
          api.getTriageQueue().catch(() => ({ queue: [] })),
          api.listPatients().catch(() => ({ patients: [] })),
          api.getImpactAnalytics({ range: 'today' }).catch(() => ({ analytics: { metrics: {} } })),
        ]);

        const queue = queueData.queue || [];
        const patients = patientsData.patients || [];
        const analytics = analyticsData.analytics || { metrics: {} };

        const redCases = queue.filter((q) => q.urgency === 'RED');
        const yellowCases = queue.filter((q) => q.urgency === 'YELLOW');
        const allUrgent = [...redCases, ...yellowCases];

        if (!alertsContainer) return;

        // Build alert cards from live data
        let alertsHtml = '';

        if (allUrgent.length > 0) {
          // Render each urgent case as an alert card
          alertsHtml = allUrgent
            .slice(0, 4) // max 4 alerts
            .map((item) => {
              const isRed = item.urgency === 'RED';
              return `
              <div class="rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm mb-4 hover:shadow-md transition-shadow">
                <div class="p-5">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-2 h-2 rounded-full ${isRed ? 'bg-error' : 'bg-tertiary'} animate-pulse"></div>
                    <span class="text-[10px] font-bold ${isRed ? 'text-error' : 'text-tertiary'} uppercase">${isRed ? 'Critical Alert' : 'Urgent Alert'}</span>
                    <span class="ml-auto text-[10px] text-stone-400">${escapeHtml(item.triage_time_display || 'Recent')}</span>
                  </div>
                  <h4 class="font-bold text-on-surface mb-1">${escapeHtml(item.patient_name)}</h4>
                  <p class="text-xs text-on-surface-variant leading-relaxed mb-2">${escapeHtml(item.reason || (item.symptoms || []).join(', ') || 'Requires clinical attention')}</p>
                  ${
                    item.recommended_action
                      ? `<div class="bg-primary/5 p-3 rounded-lg mb-3">
                        <p class="text-xs font-bold text-primary mb-1">Recommended Action</p>
                        <p class="text-xs text-on-surface-variant">${escapeHtml(item.recommended_action)}</p>
                      </div>`
                      : ''
                  }
                  ${
                    item.symptoms?.length
                      ? `<div class="flex flex-wrap gap-1.5 mb-2">${item.symptoms.map((s) => `<span class="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px] font-bold text-on-surface-variant">${escapeHtml(s)}</span>`).join('')}</div>`
                      : ''
                  }
                  <div class="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                    <span class="${urgencyTone(item.urgency)} px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">${escapeHtml(urgencyLabel(item.urgency))}</span>
                    <a class="text-xs font-bold text-[#5C6E2E] flex items-center gap-1 hover:underline" href="the-ward-patient-queue.html">
                      View in Queue <span class="material-symbols-outlined text-xs">arrow_forward</span>
                    </a>
                  </div>
                </div>
              </div>
            `;
            })
            .join('');
        } else if (patients.length > 0) {
          // No urgent cases but have patients
          alertsHtml = `
            <div class="rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm mb-4">
              <div class="p-5">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-2 h-2 rounded-full bg-[#5C6E2E]"></div>
                  <span class="text-[10px] font-bold text-[#5C6E2E] uppercase">All Clear</span>
                </div>
                <h4 class="font-bold text-on-surface mb-2">No Urgent Cases</h4>
                <p class="text-xs text-on-surface-variant leading-relaxed">All ${patients.length} patients are currently stable. No critical or urgent triage alerts.</p>
              </div>
            </div>
          `;
        } else {
          alertsHtml = `
            <div class="rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm mb-4">
              <div class="p-5">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-2 h-2 rounded-full bg-stone-400"></div>
                  <span class="text-[10px] font-bold text-stone-500 uppercase">No Data</span>
                </div>
                <h4 class="font-bold text-on-surface mb-2">No Patients Yet</h4>
                <p class="text-xs text-on-surface-variant leading-relaxed">Add patients and run triage assessments to see live health alerts here.</p>
              </div>
            </div>
          `;
        }

        // Add summary stats bar
        const statsHtml = `
          <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="bg-surface-container-lowest p-3 rounded-xl text-center">
              <div class="text-2xl font-bold font-['Instrument_Serif'] italic ${redCases.length > 0 ? 'text-error' : 'text-on-surface'}">${redCases.length}</div>
              <div class="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Critical</div>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded-xl text-center">
              <div class="text-2xl font-bold font-['Instrument_Serif'] italic ${yellowCases.length > 0 ? 'text-tertiary' : 'text-on-surface'}">${yellowCases.length}</div>
              <div class="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Urgent</div>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded-xl text-center">
              <div class="text-2xl font-bold font-['Instrument_Serif'] italic text-[#5C6E2E]">${patients.length}</div>
              <div class="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total</div>
            </div>
          </div>
        `;

        // Add last-updated timestamp
        const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const footerHtml = `
          <div class="flex items-center justify-between text-[10px] text-stone-400 mt-2">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[10px]">schedule</span>
              Updated ${now}
            </span>
            <button class="flex items-center gap-1 text-[#5C6E2E] font-bold hover:underline" data-refresh-alerts>
              <span class="material-symbols-outlined text-[10px]">refresh</span>
              Refresh
            </button>
          </div>
        `;

        alertsContainer.innerHTML = `
          <h3 class="text-primary font-bold text-xs uppercase tracking-widest mb-4">Live Health Alerts</h3>
          ${statsHtml}
          <div data-alerts-list>${alertsHtml}</div>
          ${footerHtml}
        `;

        // Wire refresh button
        const refreshBtn = alertsContainer.querySelector('[data-refresh-alerts]');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => {
            refreshBtn.innerHTML = '<span class="material-symbols-outlined text-[10px] animate-spin">refresh</span> Loading…';
            loadAlerts();
          });
        }
      } catch (err) {
        console.warn('[ward-crud] ai-assistant alerts load error:', err.message);
      }
    }

    await loadAlerts();
    // Refresh alerts every 20 seconds
    setInterval(loadAlerts, 20000);
  }

  async function bootPatientProfile(api) {
    const main = document.querySelector('main');
    if (!main) return;

    let patientId = getActivePatientId();
    if (!patientId) {
      try {
        const list = await api.listPatients();
        patientId = list.patients?.[0]?.id || null;
      } catch (_error) {
        patientId = null;
      }
    }

    if (!patientId) {
      main.innerHTML =
        '<section class="p-8"><h2 class="text-3xl font-bold">No patient selected</h2><p class="mt-2 text-stone-500">Open a patient from the queue to view profile details.</p></section>';
      return;
    }

    setActivePatientId(patientId);

    try {
      const [summaryData, notesData, followupData] = await Promise.all([
        api.request(`/api/patients/${encodeURIComponent(patientId)}/summary`),
        api.listNotes({ patient_id: patientId, limit: 5 }),
        api.listFollowups({ patient_id: patientId }),
      ]);
      const summary = summaryData.summary;
      const notes = notesData.notes || [];
      const followups = followupData.followups || [];
      const patient = summary?.patient || {};
      const latest = summary?.latest_assessment;

      main.innerHTML = `
        <section class="p-8 space-y-6">
          <div>
            <h1 class="text-5xl font-['Newsreader']">${escapeHtml(patient.full_name || 'Patient')}</h1>
            <p class="text-stone-600 mt-2">ID: ${escapeHtml(patient.id || patientId)} • ${escapeHtml(formatAgeMonths(patient.age_months))}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article class="bg-white rounded-xl p-6">
              <h2 class="text-xl font-bold mb-3">Latest triage</h2>
              <p><strong>Urgency:</strong> ${escapeHtml(latest?.urgency || 'GREEN')}</p>
              <p class="mt-2"><strong>Reason:</strong> ${escapeHtml(latest?.reason || 'No triage summary yet.')}</p>
              <p class="mt-2"><strong>Action:</strong> ${escapeHtml(latest?.recommended_action || 'No action recorded.')}</p>
            </article>
            <article class="bg-white rounded-xl p-6">
              <h2 class="text-xl font-bold mb-3">Next follow-up</h2>
              <p>${escapeHtml(followups[0]?.due_date || 'No follow-up scheduled')}</p>
              <p class="mt-2 text-stone-600">${escapeHtml(followups[0]?.instructions || '')}</p>
            </article>
          </div>
          <article class="bg-white rounded-xl p-6">
            <h2 class="text-xl font-bold mb-3">Recent SOAP notes</h2>
            ${
              notes.length
                ? `<ul class="space-y-3">${notes
                    .map(
                      (note) => `<li class="border border-stone-100 rounded-lg p-3">
                          <div class="text-sm text-stone-500">${escapeHtml(note.created_at || '')}</div>
                          <div class="font-semibold">${escapeHtml((Array.isArray(note.assessment) ? note.assessment[0] : note.assessment) || 'No assessment')}</div>
                          <div class="text-sm text-stone-600">${escapeHtml((Array.isArray(note.plan) ? note.plan[0] : note.plan) || '')}</div>
                        </li>`
                    )
                    .join('')}</ul>`
                : '<p class="text-stone-500">No notes available.</p>'
            }
          </article>
        </section>
      `;
    } catch (err) {
      main.innerHTML = `<section class="p-8"><h2 class="text-3xl font-bold">Unable to load profile</h2><p class="mt-2 text-stone-500">${escapeHtml(err.message || 'Try again shortly.')}</p></section>`;
    }
  }

  // ═══════════════════════════════════════════
  // Impact Dashboard Page — Live KPIs
  // ═══════════════════════════════════════════

  async function bootImpactDashboard(api) {
    const main = document.querySelector('main');
    if (!main) return;

    // Wire date filter buttons
    const filterBtns = main.querySelectorAll('.rounded-full.text-sm.font-medium, .rounded-full.text-sm.font-bold');
    let currentRange = 'month';

    async function loadImpact(range) {
      try {
        const [analyticsData, patientsData, queueData] = await Promise.all([
          api.getImpactAnalytics({ range }).catch(() => ({ analytics: { metrics: {} } })),
          api.listPatients().catch(() => ({ patients: [] })),
          api.getTriageQueue().catch(() => ({ queue: [] })),
        ]);

        const metrics = analyticsData.analytics?.metrics || {};
        const patients = patientsData.patients || [];
        const queue = queueData.queue || [];
        const redCases = queue.filter((q) => q.urgency === 'RED');

        // Update the 4 KPI cards
        const kpiCards = main.querySelectorAll('section.grid.grid-cols-1.md\\:grid-cols-4 > div');
        if (kpiCards.length >= 4) {
          // Card 1: Patients Managed
          const val1 = kpiCards[0].querySelector('.text-5xl');
          if (val1) val1.textContent = String(metrics.patients_managed ?? patients.length).toLocaleString();

          // Card 2: RED Cases Resolved
          const val2 = kpiCards[1].querySelector('.text-5xl');
          const rr = metrics.red_resolution_rate ?? 0;
          if (val2) val2.innerHTML = `${(rr * 100).toFixed(1)}<span class="text-2xl ml-1 text-on-surface-variant/40">%</span>`;

          // Card 3: Follow-up Rate
          const val3 = kpiCards[2].querySelector('.text-5xl');
          const fr = metrics.followup_rate ?? 0;
          if (val3) val3.innerHTML = `${Math.round(fr * 100)}<span class="text-2xl ml-1 text-on-surface-variant/40">%</span>`;

          // Card 4: Documentation Coverage
          const val4 = kpiCards[3].querySelector('.text-5xl');
          const dc = metrics.documentation_coverage ?? 0;
          if (val4) {
            if (dc > 0) {
              val4.innerHTML = `${(dc * 100).toFixed(0)}<span class="text-2xl ml-1 text-on-surface-variant/40">%</span>`;
            } else {
              val4.textContent = '—';
            }
          }
        }

        // Update donut chart center number
        const donutCenter = main.querySelector('.text-3xl.font-headline');
        if (donutCenter) {
          donutCenter.textContent = String(queue.length || patients.length);
        }
        const donutLabel = donutCenter?.nextElementSibling;
        if (donutLabel) donutLabel.textContent = 'Triage Cases';
      } catch (err) {
        console.warn('[ward-crud] impact load error:', err.message);
      }
    }

    // Wire filter buttons
    filterBtns.forEach((btn) => {
      const label = btn.textContent.trim().toLowerCase();
      if (['today', 'week', 'month'].includes(label)) {
        btn.addEventListener('click', () => {
          currentRange = label;
          filterBtns.forEach((b) => {
            b.className = b.className
              .replace('bg-primary text-on-primary font-bold', 'text-on-surface-variant hover:text-on-surface font-medium')
              .replace('font-bold', 'font-medium');
          });
          btn.className = btn.className
            .replace('text-on-surface-variant hover:text-on-surface font-medium', 'bg-primary text-on-primary font-bold')
            .replace('font-medium', 'font-bold');
          loadImpact(currentRange);
        });
      }
    });

    await loadImpact(currentRange);
    setInterval(() => loadImpact(currentRange), 30000);
  }

  // ═══════════════════════════════════════════
  // SOAP Notes Page — Live Notes List  
  // ═══════════════════════════════════════════

  async function bootSoapNotes(api) {
    const main = document.querySelector('main');
    if (!main) return;

    try {
      const [notesData, patientsData] = await Promise.all([
        api.listNotes({ limit: 20 }).catch(() => ({ notes: [] })),
        api.listPatients().catch(() => ({ patients: [] })),
      ]);

      const notes = notesData.notes || [];
      const patients = patientsData.patients || [];

      // Build a patient lookup map
      const patientMap = {};
      patients.forEach((p) => (patientMap[p.id] = p.full_name));

      // Try to find the notes list container — usually a table or card list
      const notesContainer = main.querySelector('tbody') || main.querySelector('[data-notes-list]');

      if (notesContainer && notes.length) {
        notesContainer.innerHTML = notes
          .map((note) => {
            const patientName = patientMap[note.patient_id] || 'Unknown';
            const assessment = Array.isArray(note.assessment) ? note.assessment[0] : note.assessment || '';
            const plan = Array.isArray(note.plan) ? note.plan[0] : note.plan || '';
            const date = note.created_at ? new Date(note.created_at).toLocaleDateString() : '—';
            return `
            <tr class="hover:bg-surface-container-low/50 transition-colors group">
              <td class="px-6 py-4 text-sm font-bold text-on-surface">${escapeHtml(patientName)}</td>
              <td class="px-6 py-4 text-sm text-on-surface-variant">${escapeHtml(assessment)}</td>
              <td class="px-6 py-4 text-sm text-on-surface-variant">${escapeHtml(plan)}</td>
              <td class="px-6 py-4 text-xs text-stone-400">${escapeHtml(date)}</td>
              <td class="px-6 py-4 text-xs text-stone-400">${escapeHtml(note.generated_by || 'CARA AI')}</td>
            </tr>`;
          })
          .join('');
      }

      // Update any note count badges
      const countBadge = main.querySelector('[data-notes-count]');
      if (countBadge) countBadge.textContent = String(notes.length);
    } catch (err) {
      console.warn('[ward-crud] soap notes load error:', err.message);
    }
  }

  // ═══════════════════════════════════════════
  // Inject Modal Animations CSS
  // ═══════════════════════════════════════════

  function injectStyles() {
    if (document.getElementById('ward-crud-styles')) return;
    const style = document.createElement('style');
    style.id = 'ward-crud-styles';
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════
  // Entry Point
  // ═══════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', () => {
    const api = createApi();
    if (!api) return;

    injectStyles();

    if (path === 'the-ward-overview.html') {
      bootOverview(api);
    }

    if (path === 'the-ward-patient-queue.html') {
      bootPatientQueue(api);
    }

    if (path === 'the-ward-ai-assistant.html') {
      bootAiAssistant(api);
    }

    if (path === 'the-ward-patient-profile.html') {
      bootPatientProfile(api);
    }

    if (path === 'the-ward-impact-dashboard.html') {
      bootImpactDashboard(api);
    }

    if (path === 'the-ward-soap-notes.html') {
      bootSoapNotes(api);
    }
  });
})(window);
