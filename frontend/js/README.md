# frontend/js

Runtime modules for CARA public pages + dashboards.

| File | Responsibility |
| --- | --- |
| `router.js` | Hash routing for Ward (7 views) and Compass (5 views) |
| `nav.js` | Public navbar state, mobile menu, ward sidebar toggle, page transitions |
| `animations.js` | GSAP/reveal animations, panel animation helper, toast helper |
| `counters.js` | Scroll-triggered counter animation for KPI values |
| `triage.js` | Symptom chip triage engine with RED/YELLOW/GREEN output |
| `voice.js` | Speech recognition dictation + speech synthesis helper |
| `soap.js` | SOAP formatter, note switching, PDF print trigger |
| `charts.js` | Impact chart rendering and date-range updates |
| `followup.js` | Queue panel actions, patient record modal, follow-up scheduling |
| `assistant.js` | AI assistant quick prompts + mock conversational responses |
| `compass-tts.js` | Compass TTS controls, language switching, meds toggle, ICS download, maps |
| `api.js` | Fetch wrappers for backend API integrations |
