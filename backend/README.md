# backend

**Assignee:** Saksham Mishra

This folder defines the API and service layers. Files are placeholders only; implementation will be added by the backend team.

| File/Folder | Job | How it will be filled | Assignee |
| --- | --- | --- | --- |
| `server.js` | Express app entry point | Add middleware stack, health route, and API route mounting | Saksham Mishra |
| `routes/` | Endpoint definitions | Add route-level request mapping and validation boundaries | Saksham Mishra |
| `controllers/` | Request handling logic | Add orchestration between route input, engine, and persistence | Saksham Mishra |
| `engine/` | Triage/protocol execution | Add protocol evaluation logic using `ml/protocols/imci.json` | Saksham Mishra |
| `db/` | SQLite lifecycle and schema setup | Add DB open/init/migration helpers | Saksham Mishra |
| `middleware/` | Shared request middleware | Add auth/audit and request policy utilities | Saksham Mishra |
| `.env` | Local backend configuration | Add `PORT`, `DB_PATH`, and API keys as required | Saksham |
| `package.json` | Backend package metadata | Add dependencies and scripts for dev/start/test | Saksham |
