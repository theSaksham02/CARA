# CARA frontend

## Structure

```
frontend/
├── index.html
├── about.html
├── research.html
├── join-us.html
├── privacy-ethics.html
├── ward/
│   └── index.html
├── compass/
│   └── index.html
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── components.css
│   ├── nav.css
│   ├── animations.css
│   └── pages/
│       ├── landing.css
│       ├── about.css
│       ├── research.css
│       ├── join-us.css
│       ├── privacy.css
│       ├── ward.css
│       └── compass.css
├── js/
│   ├── router.js
│   ├── nav.js
│   ├── animations.js
│   ├── counters.js
│   ├── triage.js
│   ├── voice.js
│   ├── soap.js
│   ├── charts.js
│   ├── followup.js
│   ├── assistant.js
│   ├── compass-tts.js
│   └── api.js
└── assets/
    ├── icons/
    ├── images/
    └── fonts/
```

## Notes

- `the-ward.html`, `patient-compass.html`, `ward-*.html`, and `patient-dashboard-*.html` are compatibility redirects to the new unified dashboard routes.
- Dashboards are hash-routed inside `ward/index.html` and `compass/index.html`.
- Run locally with:
  - `cd /Users/sakshammishra/CARA`
  - `python3 -m http.server 5173 --directory frontend`
