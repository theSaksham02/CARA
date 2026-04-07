# 🩺 Diya Guide — Protocol Researcher

**Your role in one line:** You are writing CARA's medical intelligence.

## What your job is

CARA triage compares symptoms against WHO IMCI-based rules.  
Your output becomes `imci.json`, which the backend engine reads directly.

## What to search and read

### 1. WHO IMCI chart booklet
Search: `WHO IMCI chart booklet PDF 2014`

Focus:
- Assess and classify the sick child (pages ~1-30)
- Cough or difficult breathing
- Diarrhoea
- Fever
- Danger signs

### 2. WHO danger signs
Search: `WHO danger signs child health IMCI`

Capture danger signs that should always map to **RED** urgency.

### 3. Doctor shortage context
Search: `WHO doctor shortage Sub-Saharan Africa statistics`

Collect 3-5 numbers and share with Anaaya for impact data.

## Files you own

| File | What you fill |
| --- | --- |
| `imci.json` | Rule list: symptoms -> classification -> urgency -> action -> reason |
| `anc.json` | Deferred placeholder for ANC rules (optional this sprint) |

## Minimum condition set for prototype

Start with 3 conditions:
1. Pneumonia (fever + breathing issues)
2. Diarrhoea with dehydration
3. Malaria / fever

For each condition, include:
- Trigger symptoms
- Danger sign overrides
- Urgency (`RED`, `YELLOW`, `GREEN`)
- Action for CHW
- One plain-English reason sentence

## Team handoffs

- **Send rules to Nirmal** for engine integration.
- **Send symptom list to Saksham** for triage UI buttons.
- **Send vocabulary to Eman** for SOAP keyword alignment.
- **Send workforce stats to Anaaya** for impact charts.

## 3-day plan

### Day 1
- Read IMCI pages 1-30
- Write symptom and classification notes
- Fill first condition in `imci.json`

### Day 2
- Complete 3 conditions
- Send `imci.json` to Nirmal
- Share symptom word list with Saksham and Eman

### Day 3
- Run Anaaya's 10 patient scenarios
- Fix rules if triage output is wrong
