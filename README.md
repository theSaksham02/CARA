# CARA Scaffold (No Code)

![CARA architecture flow](./architecture-flow.png)

This repository is now a **code-free scaffold**.  
All non-README files are intentionally empty placeholders for the team to implement later.

## Task owners

- **Saksham Mishra**: frontend flow, repository structure, and integration coordination
- **Nirmal**: shared REST API, backend modules, and protocol-engine integration

## Root files

| File | Job | How it will be filled | Owner |
| --- | --- | --- | --- |
| `.gitignore` | Ignore generated/local files | Add ignore rules for node, python cache, db, and env files | Saksham Mishra |
| `docker-compose.yml` | Local multi-service run config | Define frontend + backend services with shared env values | Nirmal |
| `architecture-flow.png` | Product architecture reference | Keep updated when app flow changes | Saksham Mishra |

## Folder responsibilities

| Folder | Job | How it will be filled | Owner |
| --- | --- | --- | --- |
| `frontend/` | UI shells and browser modules | Team will add HTML/CSS/JS implementation for FieldView and ClinIQ | Saksham Mishra |
| `backend/` | API, controllers, engine, and db setup | Team will add Express routes, controller logic, and persistence layer | Nirmal |
| `ml/` | Protocol rules, SOAP formatter inputs, impact data | Team will add validated protocol JSON and formatter logic | Nirmal |
