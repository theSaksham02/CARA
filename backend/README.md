# backend

Node.js + Express backend for CARA triage, patient history, SOAP notes, follow-ups, and demo-grade RAG retrieval.

## Local setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Start backend in memory mode (default without DB env vars):

```bash
npm run dev
```

3. Run tests:

```bash
npm test
```

## Demo RAG runbook

RAG uses two trusted memory sources:
- Protocol memory: `ml/protocols/imci.json`
- Patient history memory: triage + SOAP + follow-up records in DB/memory store

### 1) Start local Ollama

Ensure Ollama is running and the configured model is available:

```bash
ollama pull llama3.2
ollama serve
```

Optional environment variables:
- `OLLAMA_URL` (default `http://localhost:11434`)
- `OLLAMA_MODEL` (default `llama3.2`)
- `RAG_CONFIDENCE_THRESHOLD` (default `0.65`)
- `RAG_MIN_EVIDENCE_SCORE` (default `0.45`)

### 2) Build or refresh RAG index

```bash
npm run rag:index
```

To index a specific patient:

```bash
node scripts/rag-demo-index.js --patient_id=<patient-id>
```

### 3) API endpoints

- `POST /api/rag/index/build`
- `POST /api/rag/index/refresh`
- `GET /api/rag/index/status`
- `POST /api/rag/query`

Example query:

```bash
curl -X POST http://localhost:4000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What urgent actions are needed for fever with chest indrawing?",
    "patient_id": "patient-demo-001",
    "top_k": 5
  }'
```

Expected response shape:

```json
{
  "answer": "Grounded response text.",
  "citations": [
    {
      "chunk_id": "rag_abc123...",
      "source_type": "protocol",
      "source_id": "imci-pneumonia-severe-red-001",
      "patient_id": null,
      "title": "Protocol RED rule",
      "section": "imci_rule",
      "timestamp": null,
      "score": 0.91
    }
  ],
  "confidence": 0.82,
  "escalate": false,
  "reason": null
}
```

If confidence is low or evidence is insufficient, CARA returns deterministic fallback behavior with:
- `escalate: true`
- a conservative fallback `answer`
- `reason` such as `no_evidence`, `low_confidence`, or `ollama_unavailable`
