# backend

**Owner:** Nirmal

This folder defines the API and service layers. Files are placeholders only; implementation will be added by the backend team.

| File/Folder | Job | How it will be filled | Owner |
| --- | --- | --- | --- |
| `server.js` | Express app entry point | Add middleware stack, health route, and API route mounting | Nirmal |
| `routes/` | Endpoint definitions | Add route-level request mapping and validation boundaries | Nirmal |
| `controllers/` | Request handling logic | Add orchestration between route input, engine, and persistence | Nirmal |
| `engine/` | Triage/protocol execution | Add protocol evaluation logic using `ml/protocols/imci.json` | Nirmal |
| `db/` | SQLite lifecycle and schema setup | Add DB open/init/migration helpers | Nirmal |
| `middleware/` | Shared request middleware | Add auth/audit and request policy utilities | Nirmal |
| `.env` | Local backend configuration | Add `PORT`, `DB_PATH`, and API keys as required | Nirmal |
| `package.json` | Backend package metadata | Add dependencies and scripts for dev/start/test | Nirmal |
