# 🔢 Eman Guide — SOAP Formatter & Data QA Lead

**Your role in one line:** You turn spoken notes into clean SOAP structure and validate team JSON quality.

## What your job is

When CHW speech is transcribed, CARA must split content into:
- **S**ubjective
- **O**bjective
- **A**ssessment
- **P**lan

You define keyword logic and formatter behavior.

## What to search and read

### 1. SOAP basics
Search: `SOAP note format medical explained simply`

### 2. Clinical vocabulary
Search: `common medical words in clinical notes`

### 3. JS string basics
Search: `JavaScript string methods for beginners`

Focus on sentence splitting and keyword matching.

### 4. IMCI vocabulary
Use the same WHO IMCI terms Diya captures so rule words and note words stay aligned.

## Files you own

| File | What you fill |
| --- | --- |
| `keywords.json` | Keyword dictionary for S/O/A/P buckets |
| `soap_formatter.js` | Logic to map transcript sentences into SOAP sections |

`soap_formatter.py` remains as a deferred/legacy placeholder.

## Formatter behavior (target)

1. Split transcript into sentences.
2. For each sentence, check keyword matches.
3. Route sentence into matching SOAP section.
4. If no match, default to **Subjective**.

## Data QA responsibility

Before handoff, validate Diya and Anaaya JSON files using JSONLint:
- Brackets and commas valid
- Field names consistent
- Structure aligns with team expectations

## Team handoffs

- **With Diya:** share IMCI vocabulary and align symptom words.
- **With Anaaya:** validate her JSON formatting before backend handoff.
- **To Nirmal:** send `soap_formatter.js` for backend note pipeline.
- **To Saksham:** share keywords to align frontend symptom wording.

## 3-day plan

### Day 1
- Read SOAP explainer
- Review JS string method basics
- Start `keywords.json`

### Day 2
- Finalize `keywords.json`
- Write first pass of `soap_formatter.js`
- JSONLint-check Diya and Anaaya files

### Day 3
- Test 3 sample transcripts
- Fix keyword mismatches
- Support Anaaya on test case validation
