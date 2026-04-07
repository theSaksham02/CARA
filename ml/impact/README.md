# 📊 Anaaya Guide — Impact & Demo Specialist

**Your role in one line:** You are CARA's proof and pitch story.

## What your job is

You own:
1. Impact numbers that appear in the clinic dashboard.
2. Test scenarios that validate full-system triage.
3. The 3-minute demo script used in judging.

## What to search and read

### 1. Workforce and access stats
Search: `WHO health workforce crisis statistics 2024`

Collect:
- Doctor-to-population ratios
- CHW workforce scale
- Access gaps in low-resource settings

### 2. CHW workload and documentation burden
Search: `community health worker patient capacity studies`

### 3. Follow-up adherence
Search: `patient follow-up adherence chronic disease Africa`

### 4. Demo structure
Search: `how to do a 3 minute hackathon demo`

Also read team docs:
- `Medical_Solution_to_Doctor_Shortage.md`
- `Business_and_Ethics.md`
- `CARA_Mitigation_Plan.md`

## Files you own

| File | What you fill |
| --- | --- |
| `ml/impact/impact_data.json` | Dashboard numbers + source references |
| `ml/tests/test_cases.json` | 10 patient scenarios with expected triage output |
| `docs/DEMO_SCRIPT.md` | Word-for-word 3-minute demo narrative |

## Test case mix (required)

- 4 RED patients
- 3 YELLOW patients
- 3 GREEN patients

Each case should include:
- Patient name and age
- Symptoms list
- Expected urgency
- Expected action (refer / monitor / routine)

## Team handoffs

- **From Diya:** symptom vocabulary and final rules.
- **To Saksham:** impact numbers for charts.
- **To Nirmal:** failed test scenarios during Day 3 system test.
- **With Eman:** coordinate SOAP demo section and script flow.

## 3-day plan

### Day 1
- Read team docs + WHO stats
- Fill `impact_data.json` with numbers and sources

### Day 2
- Write 10 test cases in `ml/tests/test_cases.json`
- Draft `docs/DEMO_SCRIPT.md`
- Validate expected outputs manually against Diya rules

### Day 3
- Run all test cases on live system
- Finalize demo script
- Rehearse 3-minute pitch with team
