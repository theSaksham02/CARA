(function attachPortalData(globalScope) {
  const path = globalScope.location.pathname.split('/').pop() || '';
  const loginByPortal = {
    clinician: 'the-ward-login.html',
    patient: 'patient-compass-login.html',
  };

  function getApiBaseUrl() {
    if (typeof globalScope.resolveCaraApiBaseUrl === 'function') {
      return globalScope.resolveCaraApiBaseUrl();
    }
    return '';
  }

  function getPortal() {
    if (path.startsWith('the-ward-')) {
      return 'clinician';
    }

    if (path.startsWith('patient-compass-')) {
      return 'patient';
    }

    return null;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) {
      return 'Not scheduled';
    }

    return new Date(value).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return 'No recent activity';
    }

    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatTime(value) {
    if (!value) {
      return 'No recent activity';
    }

    return new Date(value).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatAgeMonths(ageMonths) {
    if (typeof ageMonths !== 'number' || Number.isNaN(ageMonths)) {
      return 'Unknown';
    }

    if (ageMonths >= 12) {
      return `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m`;
    }

    return `${ageMonths}m`;
  }

  function urgencyTone(urgency) {
    if (urgency === 'RED') {
      return 'bg-error-container text-on-error-container';
    }

    if (urgency === 'YELLOW') {
      return 'bg-secondary-container text-on-secondary-container';
    }

    return 'bg-primary-fixed text-on-primary-fixed';
  }

  function urgencyLabel(urgency) {
    if (urgency === 'RED') {
      return 'Critical';
    }

    if (urgency === 'YELLOW') {
      return 'Urgent';
    }

    return 'Stable';
  }

  function emptyCard(title, message) {
    return `
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8">
        <h3 class="text-2xl font-bold text-on-surface mb-2">${escapeHtml(title)}</h3>
        <p class="text-on-surface-variant">${escapeHtml(message)}</p>
      </div>
    `;
  }

  function createApi() {
    return new globalScope.CaraApi({
      baseUrl: getApiBaseUrl(),
    });
  }

  function setSignedInLabels(session) {
    const email = session?.user?.email || 'Signed in';
    const displayName = email.split('@')[0] || email;

    document.querySelectorAll('[data-auth-user-name]').forEach((node) => {
      node.textContent = displayName;
    });

    document.querySelectorAll('[data-auth-user-subtitle]').forEach((node) => {
      node.textContent = email;
    });
  }

  async function resolveMode() {
    const portal = getPortal();
    if (!portal || !globalScope.CaraAuth) {
      return null;
    }

    const demoPortal = globalScope.CaraAuth.getDemoMode?.();
    if (demoPortal === portal) {
      return { mode: 'demo', portal };
    }

    const session = await globalScope.CaraAuth.getSession();
    if (!session) {
      globalScope.location.href = loginByPortal[portal];
      return null;
    }

    globalScope.CaraAuth.clearDemoMode?.();
    setSignedInLabels(session);
    return { mode: 'live', portal, session };
  }

  function renderOverview(main, overview, analytics) {
    const kpis = overview.kpis || {};
    const cases = overview.high_urgency_cases || [];
    const volume = analytics?.metrics?.patients_managed ?? 0;
    const followupRate = analytics?.metrics?.followup_rate ?? 0;
    const assistantCase = cases[0] || null;

    main.innerHTML = `
      <div class="w-full space-y-8">
        <section class="flex flex-col gap-3">
          <h2 class="serif-text text-5xl font-light text-on-surface">Live clinician overview</h2>
          <p class="text-on-surface-variant font-medium">This screen is now driven by your backend data.</p>
        </section>
        <section class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-[#5C6E2E]">
            <div class="text-sm font-semibold uppercase tracking-wider text-stone-500">Patients Total</div>
            <div class="instrument-text text-6xl text-[#5C6E2E]">${escapeHtml(kpis.patients_total ?? 0)}</div>
          </div>
          <div class="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-error">
            <div class="text-sm font-semibold uppercase tracking-wider text-stone-500">Triaged Today</div>
            <div class="instrument-text text-6xl text-error">${escapeHtml(kpis.patients_triaged_today ?? 0)}</div>
          </div>
          <div class="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-[#5C6E2E]">
            <div class="text-sm font-semibold uppercase tracking-wider text-stone-500">SOAP Notes Today</div>
            <div class="instrument-text text-6xl text-[#5C6E2E]">${escapeHtml(kpis.soap_notes_today ?? 0)}</div>
          </div>
          <div class="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-[#5C6E2E]">
            <div class="text-sm font-semibold uppercase tracking-wider text-stone-500">Follow-ups Due</div>
            <div class="instrument-text text-6xl text-[#5C6E2E]">${escapeHtml(kpis.followups_due ?? 0)}</div>
          </div>
        </section>
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-surface-container-lowest rounded-xl p-8">
              <div class="flex justify-between items-center mb-6">
                <h3 class="serif-text text-2xl">High Urgency Cases</h3>
                <a class="text-primary font-semibold text-sm hover:underline" href="the-ward-patient-queue.html">Open queue</a>
              </div>
              ${
                cases.length
                  ? `
                <div class="space-y-4">
                  ${cases
                    .map(
                      (item) => `
                    <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low">
                      <div>
                        <div class="font-bold text-on-surface">${escapeHtml(item.patient_name)}</div>
                        <div class="text-sm text-on-surface-variant">${escapeHtml(item.condition_label || item.reason || 'No condition summary yet.')}</div>
                      </div>
                      <div class="text-right">
                        <div class="inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${urgencyTone(item.urgency)}">${escapeHtml(item.urgency)}</div>
                        <div class="text-xs text-on-surface-variant mt-2">${escapeHtml(item.triage_time_display || formatTime(item.triage_time))}</div>
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : emptyCard('No urgent cases', 'Once live triage data exists, urgent patients will show here automatically.')
              }
            </div>
            <div class="grid grid-cols-2 gap-6">
              <div class="bg-surface-container rounded-xl p-6">
                <p class="text-xs uppercase tracking-widest text-stone-500 mb-1 font-bold">Patient Volume</p>
                <p class="text-lg font-bold">${escapeHtml(volume)} managed in this range</p>
              </div>
              <div class="bg-surface-container rounded-xl p-6">
                <p class="text-xs uppercase tracking-widest text-stone-500 mb-1 font-bold">Follow-up Compliance</p>
                <p class="text-lg font-bold">${escapeHtml(followupRate)}% follow-up rate</p>
              </div>
            </div>
          </div>
          <div class="bg-primary text-on-primary-container rounded-xl p-8">
            <div class="text-[10px] uppercase tracking-widest opacity-70 mb-3">Live Assistant Summary</div>
            ${
              assistantCase
                ? `
              <div class="space-y-4">
                <p class="text-sm leading-relaxed">
                  <span class="font-bold">${escapeHtml(assistantCase.patient_name)}</span> is currently marked
                  <span class="font-bold">${escapeHtml(assistantCase.urgency)}</span>.
                </p>
                <div class="bg-white/10 rounded-2xl p-5">
                  <p class="text-sm leading-relaxed">${escapeHtml(assistantCase.reason || 'No reason recorded yet.')}</p>
                </div>
                <div class="text-sm font-bold">Recommended action</div>
                <p class="text-sm leading-relaxed">${escapeHtml(assistantCase.recommended_action || 'No recommendation recorded yet.')}</p>
              </div>
            `
                : '<p class="text-sm leading-relaxed">No live urgent case is available yet. When clinicians create assessments, this panel will summarize the next action here.</p>'
            }
          </div>
        </section>
      </div>
    `;
  }

  function renderQueue(main, queue) {
    const selected = queue[0] || null;

    main.innerHTML = `
      <div class="flex-1 max-w-[calc(100%-400px)]">
        <div class="mb-10">
          <h2 class="font-instrument text-6xl text-on-surface mb-4 italic">Patient Queue</h2>
          <p class="text-on-surface-variant">Live queue data from CARA backend.</p>
        </div>
        <div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-high/30 border-b border-surface-variant">
                <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Priority</th>
                <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Name</th>
                <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Age</th>
                <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Symptoms</th>
                <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Protocol</th>
                <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Triage Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-variant">
              ${
                queue.length
                  ? queue
                      .map(
                        (item) => `
                    <tr class="hover:bg-surface-container-low/50 transition-colors">
                      <td class="px-6 py-5"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${urgencyTone(item.urgency)}">${escapeHtml(urgencyLabel(item.urgency))}</span></td>
                      <td class="px-6 py-5">
                        <p class="font-bold text-on-surface">${escapeHtml(item.patient_name)}</p>
                        <p class="text-xs text-on-surface-variant">ID: ${escapeHtml(item.patient_id)}</p>
                      </td>
                      <td class="px-6 py-5 text-sm">${escapeHtml(item.age_display || formatAgeMonths(item.age_months))}</td>
                      <td class="px-6 py-5 text-sm">${escapeHtml((item.symptoms || []).join(', ') || 'No symptoms recorded')}</td>
                      <td class="px-6 py-5 text-sm">${escapeHtml(item.matched_rule_id || 'unclassified')}</td>
                      <td class="px-6 py-5 text-sm">${escapeHtml(item.triage_time_display || formatTime(item.triage_time))}</td>
                    </tr>
                  `
                      )
                      .join('')
                  : `
                    <tr>
                      <td class="px-6 py-10 text-sm text-on-surface-variant" colspan="6">No live queue entries yet. Create a patient and run triage to populate this screen.</td>
                    </tr>
                  `
              }
            </tbody>
          </table>
        </div>
      </div>
      <aside class="w-[400px] sticky top-24 h-[calc(100vh-120px)] bg-surface-container-low rounded-xl border border-outline-variant/10 flex flex-col overflow-hidden">
        ${
          selected
            ? `
          <div class="p-6 border-b border-surface-variant">
            <h3 class="font-headline text-2xl text-on-surface leading-tight">${escapeHtml(selected.patient_name)}</h3>
            <p class="text-sm text-on-surface-variant mt-1">${escapeHtml(selected.age_display || formatAgeMonths(selected.age_months))} • ${escapeHtml(selected.urgency)}</p>
          </div>
          <div class="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
            <div>
              <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Current triage reason</h4>
              <div class="bg-surface-container-lowest p-4 rounded-lg text-sm text-on-surface-variant leading-relaxed">${escapeHtml(selected.reason || 'No reason recorded yet.')}</div>
            </div>
            <div>
              <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Symptoms</h4>
              <div class="flex flex-wrap gap-2">
                ${(selected.symptoms || []).map((symptom) => `<span class="bg-surface-container-lowest px-3 py-1 rounded-full text-xs font-bold">${escapeHtml(symptom)}</span>`).join('') || '<span class="text-sm text-on-surface-variant">No symptoms recorded.</span>'}
              </div>
            </div>
            <div>
              <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Recommended action</h4>
              <div class="bg-primary/5 p-4 rounded-lg text-sm text-on-surface-variant leading-relaxed">${escapeHtml(selected.recommended_action || 'No recommendation recorded yet.')}</div>
            </div>
            <div>
              <h4 class="text-xs font-bold text-primary uppercase tracking-widest mb-3">Protocol</h4>
              <div class="text-sm font-semibold text-on-surface">${escapeHtml(selected.matched_rule_id || 'unclassified')}</div>
            </div>
          </div>
        `
            : `
          <div class="p-6">
            <h3 class="font-headline text-2xl text-on-surface leading-tight">No live queue yet</h3>
            <p class="text-sm text-on-surface-variant mt-2">Once a triage assessment is created, the selected patient details will appear here.</p>
          </div>
        `
        }
      </aside>
    `;
  }

  function renderSoap(main, notes, api) {
    main.innerHTML = `
      <aside class="w-80 h-full bg-surface-container-low flex flex-col border-r-0">
        <div class="p-6">
          <h2 class="text-2xl font-headline italic mb-2">Live SOAP Notes</h2>
          <p class="text-sm text-on-surface-variant">Generated notes from the backend.</p>
        </div>
        <div class="flex-grow overflow-y-auto px-4 space-y-2 pb-8" data-live-note-list=""></div>
      </aside>
      <section class="flex-grow h-full overflow-y-auto bg-surface p-12 space-y-6" data-live-note-detail=""></section>
    `;

    const list = main.querySelector('[data-live-note-list]');
    const detail = main.querySelector('[data-live-note-detail]');
    const state = {
      notes: Array.isArray(notes) ? notes : [],
      selectedIndex: 0,
    };

    function firstValue(value, fallback = '') {
      if (Array.isArray(value)) return value[0] || fallback;
      if (value === null || value === undefined) return fallback;
      return String(value);
    }

    async function hydratePatientOptions(select) {
      if (!select) return;
      try {
        const response = await api.listPatients();
        select.innerHTML = `<option value="">Unlinked patient note</option>${(response.patients || [])
          .map((patient) => `<option value="${patient.id}">${escapeHtml(patient.full_name)} (${escapeHtml(patient.id.slice(0, 8))}...)</option>`)
          .join('')}`;
      } catch (_error) {
        select.innerHTML = '<option value="">Unlinked patient note</option>';
      }
    }

    function renderDetail(note) {
      detail.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-8">
          <form class="p-6 rounded-xl bg-surface-container-lowest shadow-sm space-y-4" data-live-note-create>
            <h2 class="text-2xl font-headline">Create SOAP note</h2>
            <label class="block text-sm font-semibold text-on-surface-variant">
              Patient
              <select class="mt-2 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2" name="patient_id"></select>
            </label>
            <label class="block text-sm font-semibold text-on-surface-variant">
              Transcript
              <textarea class="mt-2 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2" name="transcript" rows="4" placeholder="Enter or paste encounter transcript..." required></textarea>
            </label>
            <button class="px-4 py-2 rounded-full bg-primary text-on-primary font-semibold" type="submit">Generate & Save</button>
            <p class="text-sm" data-live-note-create-feedback></p>
          </form>
          ${
            !note
              ? emptyCard('No live notes yet', 'Generate a SOAP note from the backend and it will appear here.')
              : `
          <div>
            <h1 class="text-5xl font-headline font-bold">${escapeHtml(note.patient_id || 'Unlinked patient')}</h1>
            <p class="text-sm text-stone-500 mt-2">${escapeHtml(formatDateTime(note.created_at))}</p>
          </div>
          <div class="space-y-6">
            ${[
              ['Subjective', note.subjective],
              ['Objective', note.objective],
              ['Assessment', note.assessment],
              ['Plan', note.plan],
            ]
              .map(
                ([label, section]) => {
                  const sectionItems = Array.isArray(section)
                    ? section
                    : section
                      ? [String(section)]
                      : [];
                  return `
              <div class="p-8 rounded-xl bg-surface-container-lowest shadow-sm">
                <h3 class="text-2xl font-headline mb-4">${escapeHtml(label)}</h3>
                ${
                  sectionItems.length
                    ? `<ul class="space-y-3">${sectionItems.map((item) => `<li class="text-on-surface-variant">${escapeHtml(item)}</li>`).join('')}</ul>`
                    : '<p class="text-on-surface-variant">No content for this section yet.</p>'
                }
              </div>
            `
                }
              )
              .join('')}
          </div>
          `
          }
        </div>
      `;

      const createForm = detail.querySelector('[data-live-note-create]');
      const feedback = detail.querySelector('[data-live-note-create-feedback]');
      const patientSelect = detail.querySelector('[name="patient_id"]');
      hydratePatientOptions(patientSelect);

      if (createForm) {
        createForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          const submitButton = createForm.querySelector('button[type="submit"]');
          const transcript = createForm.querySelector('[name="transcript"]')?.value?.trim() || '';
          const patientId = createForm.querySelector('[name="patient_id"]')?.value || undefined;
          if (!transcript) return;
          if (submitButton) submitButton.disabled = true;
          if (feedback) feedback.textContent = '';

          try {
            await api.generateNote({
              patient_id: patientId || undefined,
              transcript,
            });
            const refreshed = await api.listNotes();
            state.notes = refreshed.notes || [];
            state.selectedIndex = 0;
            renderListAndDetail();
            if (feedback) {
              feedback.textContent = 'SOAP note saved successfully.';
            }
          } catch (error) {
            if (feedback) {
              feedback.textContent = error.message || 'Could not save SOAP note.';
            }
          } finally {
            if (submitButton) submitButton.disabled = false;
          }
        });
      }
    }

    function renderListAndDetail() {
      if (!state.notes.length) {
        list.innerHTML = '<div class="p-4 text-sm text-on-surface-variant">No live notes yet.</div>';
        renderDetail(null);
        return;
      }

      list.innerHTML = state.notes
        .map(
          (note, index) => `
      <button class="w-full text-left p-4 rounded-xl ${index === 0 ? 'bg-surface-container-lowest shadow-sm' : 'bg-transparent hover:bg-surface-container-high'} transition-all" data-note-index="${index}" type="button">
        <div class="flex justify-between items-start mb-1">
          <span class="font-bold text-on-surface">${escapeHtml(note.patient_id || 'Unlinked patient')}</span>
          <span class="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] font-bold uppercase tracking-tighter">SOAP</span>
        </div>
        <p class="text-xs text-stone-500 mb-2">${escapeHtml(formatDateTime(note.created_at))}</p>
        <p class="text-xs text-on-surface-variant">${escapeHtml(firstValue(note.assessment, firstValue(note.plan, 'No summary available yet.')))}</p>
      </button>
    `
        )
        .join('');

      renderDetail(state.notes[state.selectedIndex] || state.notes[0]);
      list.querySelectorAll('[data-note-index]').forEach((button) => {
        button.addEventListener('click', () => {
          state.selectedIndex = Number(button.dataset.noteIndex);
          renderDetail(state.notes[state.selectedIndex]);
        });
      });
    }

    renderListAndDetail();
  }

  function renderImpact(main, analytics) {
    const metrics = analytics.metrics || {};
    const dailyVolume = analytics.daily_volume || [];
    const conditions = analytics.condition_mix || [];
    const urgency = analytics.urgency_breakdown || [];

    main.innerHTML = `
      <div class="pt-24 pb-12 px-8 max-w-7xl mx-auto space-y-10">
        <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 class="font-instrument text-7xl md:text-8xl text-on-surface tracking-tight">Clinic Impact</h2>
            <p class="text-on-surface-variant max-w-md mt-4 font-body leading-relaxed">Live analytics from the CARA backend for the selected range.</p>
          </div>
          <div class="px-6 py-2 rounded-full bg-surface-container text-sm font-bold uppercase tracking-widest text-on-surface-variant">${escapeHtml(analytics.range || 'today')}</div>
        </section>
        <section class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-surface-container-lowest p-8 rounded-xl"><div class="text-sm text-on-surface-variant">Patients Managed</div><div class="text-5xl font-instrument italic mt-4">${escapeHtml(metrics.patients_managed ?? 0)}</div></div>
          <div class="bg-surface-container-lowest p-8 rounded-xl"><div class="text-sm text-on-surface-variant">RED Cases</div><div class="text-5xl font-instrument italic mt-4">${escapeHtml(metrics.red_cases ?? 0)}</div></div>
          <div class="bg-surface-container-lowest p-8 rounded-xl"><div class="text-sm text-on-surface-variant">Follow-up Rate</div><div class="text-5xl font-instrument italic mt-4">${escapeHtml(metrics.followup_rate ?? 0)}%</div></div>
          <div class="bg-surface-container-lowest p-8 rounded-xl"><div class="text-sm text-on-surface-variant">Documentation Coverage</div><div class="text-5xl font-instrument italic mt-4">${escapeHtml(metrics.documentation_coverage ?? 0)}%</div></div>
        </section>
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm">
            <h3 class="text-2xl font-headline italic text-on-surface mb-6">Daily volume</h3>
            ${
              dailyVolume.length
                ? `<div class="space-y-4">${dailyVolume
                    .map(
                      (item) => `
                    <div>
                      <div class="flex justify-between text-sm mb-2">
                        <span>${escapeHtml(item.date)}</span>
                        <span class="font-bold">${escapeHtml(item.count)}</span>
                      </div>
                      <div class="h-3 rounded-full bg-surface-container-highest overflow-hidden">
                        <div class="h-full bg-primary rounded-full" style="width:${Math.max(item.count * 12, 8)}%"></div>
                      </div>
                    </div>
                  `
                    )
                    .join('')}</div>`
                : '<p class="text-on-surface-variant">No live analytics in this range yet.</p>'
            }
          </div>
          <div class="bg-[#EDE6D6] p-8 rounded-xl">
            <h3 class="text-xl font-headline italic text-on-surface mb-6">Urgency Breakdown</h3>
            <div class="space-y-4">
              ${urgency
                .map(
                  (item) => `
                <div class="flex items-center justify-between">
                  <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${urgencyTone(item.urgency)}">${escapeHtml(item.urgency)}</span>
                  <span class="font-bold">${escapeHtml(item.count)}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </section>
        <section class="bg-surface-container-low p-8 lg:p-12 rounded-xl">
          <h3 class="text-3xl font-headline italic text-on-surface mb-6">Top Conditions</h3>
          ${
            conditions.length
              ? `<div class="space-y-4">${conditions
                  .map(
                    (item) => `
                  <div class="flex items-center justify-between gap-4">
                    <span class="font-medium text-on-surface">${escapeHtml(item.label)}</span>
                    <span class="text-sm font-bold text-primary">${escapeHtml(item.count)} cases</span>
                  </div>
                `
                  )
                  .join('')}</div>`
              : '<p class="text-on-surface-variant">No condition mix yet. Triage data will appear here once assessments are created.</p>'
          }
        </section>
      </div>
    `;
  }

  function renderPatientHome(main, summary, session) {
    if (!summary) {
      main.innerHTML = emptyCard(
        'No visit data yet',
        'Your account is signed in, but there is no patient record linked to it yet. Once a visit is recorded, your summary will appear here.'
      );
      return;
    }

    const name = summary.patient?.full_name || session.user.email || 'Friend';
    const urgency = summary.latest_assessment?.urgency || 'GREEN';
    const symptoms = summary.highlighted_symptoms || [];

    main.innerHTML = `
      <section class="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(32,27,16,0.05)] flex justify-between items-start">
        <div class="space-y-2">
          <h1 class="serif-display text-4xl font-semibold text-primary leading-tight">Hello, ${escapeHtml(name)}.</h1>
          <p class="text-lg text-on-surface-variant font-medium">Here is your live health summary from CARA.</p>
        </div>
        <div class="px-4 py-2 rounded-full text-sm font-bold uppercase ${urgencyTone(urgency)}">${escapeHtml(urgencyLabel(urgency))}</div>
      </section>
      <section class="bg-${urgency === 'RED' ? 'error-container/40' : 'surface-container'} rounded-xl p-8 space-y-4">
        <h2 class="text-2xl font-extrabold uppercase tracking-tight">${escapeHtml(summary.latest_assessment?.reason || 'No urgent summary recorded.')}</h2>
        <p class="text-lg">${escapeHtml(summary.latest_assessment?.recommended_action || 'You do not have any live next-step guidance yet.')}</p>
      </section>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        ${
          symptoms.length
            ? symptoms
                .map(
                  (symptom) => `
              <div class="bg-surface-container-high p-5 rounded-lg text-center">
                <span class="font-bold text-sm text-on-surface">${escapeHtml(symptom)}</span>
              </div>
            `
                )
                .join('')
            : '<div class="bg-surface-container-high p-5 rounded-lg text-center md:col-span-3"><span class="font-bold text-sm text-on-surface">No highlighted symptoms yet.</span></div>'
        }
      </div>
      <section class="bg-surface-container p-8 rounded-xl border-2 border-primary/10">
        <h3 class="text-xl font-bold text-on-surface mb-2">Next follow-up</h3>
        ${
          summary.next_followup
            ? `
          <p class="text-on-surface-variant font-medium">${escapeHtml(formatDate(summary.next_followup.due_date))}</p>
          <p class="text-on-surface mt-3">${escapeHtml(summary.next_followup.instructions || 'No follow-up instructions yet.')}</p>
        `
            : '<p class="text-on-surface-variant">No follow-up has been scheduled yet.</p>'
        }
      </section>
      <section class="bg-surface-container-high p-8 rounded-xl">
        <h3 class="text-2xl font-bold mb-4">Clinician note</h3>
        <p class="text-on-surface leading-relaxed">${escapeHtml(summary.clinician_note?.summary || 'No clinician note has been added yet.')}</p>
      </section>
    `;
  }

  function renderPatientVisit(main, summary, session) {
    if (!summary) {
      main.innerHTML = emptyCard(
        'No visit summary yet',
        'This account does not have a linked patient summary yet. Add patient, triage, note, and follow-up data to see this page populate.'
      );
      return;
    }

    const note = summary.clinician_note;
    const assessment = summary.latest_assessment;

    main.innerHTML = `
      <section class="mb-10">
        <h1 class="font-instrument text-6xl md:text-7xl text-primary mb-4 leading-none">Your Visit Today</h1>
        <div class="bg-surface-container-low p-6 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p class="text-on-surface-variant font-medium text-sm">Patient</p>
            <p class="text-xl font-bold">${escapeHtml(summary.patient.full_name || session.user.email || 'Patient')}</p>
          </div>
          <div class="flex items-center gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined" data-icon="calendar_today">calendar_today</span>
            <span class="font-semibold">${escapeHtml(formatDateTime(assessment?.created_at || note?.created_at))}</span>
          </div>
        </div>
      </section>
      <section class="mb-12">
        <div class="bg-primary text-on-primary p-8 rounded-xl">
          <h2 class="text-2xl font-bold mb-1">Your visit summary is ready</h2>
          <p class="opacity-90">${escapeHtml(assessment?.reason || 'No assessment summary yet.')}</p>
        </div>
      </section>
      <section class="mb-12">
        <h3 class="text-3xl font-headline font-bold mb-8 text-on-background px-2">What to do next</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${
            (note?.care_plan?.length ? note.care_plan : [assessment?.recommended_action || 'No care steps yet.'])
              .slice(0, 3)
              .map(
                (item) => `
              <div class="bg-surface-container-lowest p-8 rounded-xl">
                <h4 class="text-xl font-bold mb-2">Next step</h4>
                <p class="text-on-surface-variant">${escapeHtml(item)}</p>
              </div>
            `
              )
              .join('')
          }
        </div>
      </section>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
        <div class="md:col-span-3 bg-surface-container-high p-8 rounded-xl">
          <h3 class="text-2xl font-bold mb-6">Clinician notes</h3>
          <div class="space-y-4 text-lg leading-relaxed text-on-surface">
            <p>${escapeHtml(note?.summary || 'No clinician note is available yet.')}</p>
          </div>
        </div>
        <div class="md:col-span-2 bg-secondary-container p-8 rounded-xl flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-bold text-on-secondary-container mb-4">Follow-up</h3>
            <p class="text-on-secondary-container mb-6 leading-relaxed">${escapeHtml(summary.next_followup?.instructions || 'No follow-up scheduled yet.')}</p>
          </div>
          <div class="bg-white/40 p-4 rounded-lg backdrop-blur-sm border border-white/20">
            <p class="text-sm font-bold mb-1">Next visit date</p>
            <p class="text-lg">${escapeHtml(formatDate(summary.next_followup?.due_date))}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderAssistant(main, queue) {
    const caseItem = queue.find((item) => item.urgency !== 'GREEN') || queue[0] || null;
    main.innerHTML = `
      <div class="pt-24 px-8 pb-12 max-w-6xl mx-auto space-y-8">
        <section>
          <h2 class="font-instrument text-6xl text-on-surface italic mb-3">AI Assistant</h2>
          <p class="text-on-surface-variant">Live assistance derived from current queue activity.</p>
        </section>
        ${
          caseItem
            ? `
          <div class="bg-primary text-on-primary-container rounded-xl p-8 space-y-6">
            <div class="text-[10px] uppercase tracking-widest opacity-70">Current focus</div>
            <h3 class="text-3xl font-bold">${escapeHtml(caseItem.patient_name)}</h3>
            <p class="text-lg leading-relaxed">${escapeHtml(caseItem.reason || 'No triage summary available yet.')}</p>
            <div class="bg-white/10 rounded-xl p-5">
              <div class="font-bold mb-2">Recommended action</div>
              <p>${escapeHtml(caseItem.recommended_action || 'No recommended action recorded.')}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              ${(caseItem.symptoms || []).map((symptom) => `<span class="bg-white/10 px-3 py-1 rounded-full text-sm">${escapeHtml(symptom)}</span>`).join('')}
            </div>
          </div>
        `
            : emptyCard('No live assistant context yet', 'Once triage data is created, the assistant page will summarize the latest queue item here.')
        }
      </div>
    `;
  }

  async function loadLivePage(session) {
    const main = document.querySelector('main');
    if (!main) {
      return;
    }

    const api = createApi();

    try {
      // Queue/overview/assistant pages are owned by ward-crud.js to avoid dual render conflicts.
      if (['the-ward-overview.html', 'the-ward-patient-queue.html', 'the-ward-ai-assistant.html', 'the-ward-patient-profile.html'].includes(path)) {
        return;
      }

      if (path === 'the-ward-soap-notes.html') {
        const { notes } = await api.listNotes();
        renderSoap(main, notes || [], api);
        return;
      }

      if (path === 'the-ward-impact-dashboard.html') {
        const { analytics } = await api.getImpactAnalytics({ range: 'month' });
        renderImpact(main, analytics || {});
        return;
      }

      if (path === 'patient-compass-home.html') {
        try {
          const { summary } = await api.getCurrentPatientSummary();
          renderPatientHome(main, summary, session);
        } catch (_error) {
          renderPatientHome(main, null, session);
        }
        return;
      }

      if (path === 'patient-compass-my-visit-summary.html') {
        try {
          const { summary } = await api.getCurrentPatientSummary();
          renderPatientVisit(main, summary, session);
        } catch (_error) {
          renderPatientVisit(main, null, session);
        }
      }
    } catch (error) {
      if (/Missing bearer token|Invalid Supabase JWT/i.test(error.message || '')) {
        globalScope.location.href = loginByPortal[getPortal()] || 'index.html';
        return;
      }

      main.innerHTML = emptyCard('Unable to load live data', error.message || 'Please try again in a moment.');
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const state = await resolveMode();
    if (!state || state.mode === 'demo') {
      return;
    }

    await loadLivePage(state.session);
  });
})(window);
