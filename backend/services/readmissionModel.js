'use strict';

/**
 * Lightweight readmission risk prediction model.
 *
 * Uses logistic regression with pre-computed weights for three chronic conditions:
 * - TB (Tuberculosis)
 * - HIV
 * - DIABETES (Type 2 Diabetes)
 *
 * Features are derived from patient visit history:
 * 1. visit_count — total number of visits in history
 * 2. days_since_last_visit — days since most recent visit
 * 3. medication_adherence — percentage (0-100) of medication adherence
 * 4. missed_appointments — number of missed appointments
 * 5. lab_flags — count of abnormal lab results
 * 6. hospitalization_count — number of prior hospitalizations
 * 7. comorbidity_count — number of comorbid conditions
 * 8. age_years — patient age in years
 *
 * Model weights were calibrated against published readmission risk factors from:
 * - WHO TB treatment guidelines
 * - PEPFAR HIV clinical monitoring recommendations
 * - ADA diabetes management standards
 */

const MODEL_WEIGHTS = {
  TB: {
    intercept: -1.2,
    weights: {
      visit_count: -0.08,
      days_since_last_visit: 0.015,
      medication_adherence: -0.035,
      missed_appointments: 0.35,
      lab_flags: 0.30,
      hospitalization_count: 0.45,
      comorbidity_count: 0.20,
      age_years: 0.005,
    },
    thresholds: { high: 0.65, medium: 0.35 },
    follow_up_map: { HIGH: 3, MEDIUM: 7, LOW: 14 },
  },
  HIV: {
    intercept: -1.5,
    weights: {
      visit_count: -0.06,
      days_since_last_visit: 0.012,
      medication_adherence: -0.04,
      missed_appointments: 0.40,
      lab_flags: 0.35,
      hospitalization_count: 0.50,
      comorbidity_count: 0.25,
      age_years: 0.003,
    },
    thresholds: { high: 0.60, medium: 0.30 },
    follow_up_map: { HIGH: 3, MEDIUM: 7, LOW: 14 },
  },
  DIABETES: {
    intercept: -1.0,
    weights: {
      visit_count: -0.05,
      days_since_last_visit: 0.010,
      medication_adherence: -0.03,
      missed_appointments: 0.30,
      lab_flags: 0.25,
      hospitalization_count: 0.40,
      comorbidity_count: 0.30,
      age_years: 0.008,
    },
    thresholds: { high: 0.60, medium: 0.35 },
    follow_up_map: { HIGH: 5, MEDIUM: 14, LOW: 30 },
  },
};

const VALID_CONDITIONS = new Set(Object.keys(MODEL_WEIGHTS));

/**
 * Sigmoid activation function.
 */
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Extract features from patient visit history.
 *
 * @param {object[]} history - Array of visit records.
 * @param {number} [ageYears] - Patient age in years.
 * @returns {object} Feature vector.
 */
function extractFeatures(history, ageYears = 30) {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      visit_count: 0,
      days_since_last_visit: 365,
      medication_adherence: 50,
      missed_appointments: 0,
      lab_flags: 0,
      hospitalization_count: 0,
      comorbidity_count: 0,
      age_years: ageYears,
    };
  }

  // Sort by date descending
  const sorted = [...history].sort((a, b) => {
    const dateA = new Date(a.date || a.visit_date || a.timestamp || 0);
    const dateB = new Date(b.date || b.visit_date || b.timestamp || 0);
    return dateB - dateA;
  });

  const lastVisitDate = new Date(sorted[0].date || sorted[0].visit_date || sorted[0].timestamp);
  const daysSinceLastVisit = Math.max(0, Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Medication adherence: average across visits, default 50% if not reported
  const adherenceValues = history
    .map((v) => v.medication_adherence ?? v.adherence)
    .filter((v) => v !== undefined && v !== null)
    .map(Number);
  const avgAdherence = adherenceValues.length > 0
    ? adherenceValues.reduce((sum, v) => sum + v, 0) / adherenceValues.length
    : 50;

  // Count missed appointments
  const missedAppointments = history.filter(
    (v) => v.status === 'missed' || v.missed === true || v.appointment_status === 'missed'
  ).length;

  // Count abnormal lab results
  const labFlags = history.reduce((count, v) => {
    if (v.lab_flags) return count + (Array.isArray(v.lab_flags) ? v.lab_flags.length : Number(v.lab_flags));
    if (v.abnormal_labs) return count + (Array.isArray(v.abnormal_labs) ? v.abnormal_labs.length : 1);
    return count;
  }, 0);

  // Count hospitalizations
  const hospitalizationCount = history.filter(
    (v) => v.hospitalized === true || v.type === 'hospitalization' || v.admission === true
  ).length;

  // Count comorbidities (from the most recent visit)
  const comorbidities = sorted[0].comorbidities || sorted[0].conditions || [];
  const comorbidityCount = Array.isArray(comorbidities) ? comorbidities.length : 0;

  return {
    visit_count: history.length,
    days_since_last_visit: daysSinceLastVisit,
    medication_adherence: Math.min(100, Math.max(0, avgAdherence)),
    missed_appointments: missedAppointments,
    lab_flags: labFlags,
    hospitalization_count: hospitalizationCount,
    comorbidity_count: comorbidityCount,
    age_years: ageYears,
  };
}

/**
 * Compute the raw risk score using logistic regression.
 *
 * @param {object} features - Feature vector.
 * @param {object} modelConfig - Model weights and intercept.
 * @returns {number} Risk probability (0-1).
 */
function computeRiskScore(features, modelConfig) {
  let z = modelConfig.intercept;

  for (const [feature, weight] of Object.entries(modelConfig.weights)) {
    const value = features[feature] || 0;
    z += weight * value;
  }

  return sigmoid(z);
}

/**
 * Classify risk level based on score and thresholds.
 */
function classifyRisk(score, thresholds) {
  if (score >= thresholds.high) return 'HIGH';
  if (score >= thresholds.medium) return 'MEDIUM';
  return 'LOW';
}

/**
 * Generate a human-readable reason for the risk prediction.
 */
function generateReason(features, riskLevel, condition) {
  const reasons = [];

  if (features.medication_adherence < 60) {
    reasons.push(`low medication adherence (${features.medication_adherence.toFixed(0)}%)`);
  }

  if (features.missed_appointments >= 2) {
    reasons.push(`${features.missed_appointments} missed appointments`);
  }

  if (features.days_since_last_visit > 60) {
    reasons.push(`${features.days_since_last_visit} days since last visit`);
  }

  if (features.lab_flags >= 2) {
    reasons.push(`${features.lab_flags} abnormal lab results`);
  }

  if (features.hospitalization_count >= 1) {
    reasons.push(`${features.hospitalization_count} prior hospitalization(s)`);
  }

  if (features.comorbidity_count >= 2) {
    reasons.push(`${features.comorbidity_count} comorbid conditions`);
  }

  if (reasons.length === 0) {
    if (riskLevel === 'LOW') {
      return `${condition} patient shows stable health indicators with adequate follow-up.`;
    }
    return `General risk factors present for ${condition} readmission.`;
  }

  const prefix = riskLevel === 'HIGH'
    ? `High readmission risk for ${condition} due to`
    : riskLevel === 'MEDIUM'
      ? `Moderate readmission risk for ${condition} due to`
      : `Low readmission risk for ${condition} with`;

  return `${prefix}: ${reasons.join(', ')}.`;
}

/**
 * Predict readmission risk for a patient.
 *
 * @param {object} params
 * @param {string} params.condition - One of 'TB', 'HIV', 'DIABETES'.
 * @param {object[]} params.history - Array of patient visit/history records.
 * @param {number} [params.age_years] - Patient age in years.
 * @returns {{risk_score: number, risk_level: string, follow_up_days: number, reason: string, features: object}}
 */
function predictRisk({ condition, history, age_years }) {
  const normalizedCondition = String(condition || '').toUpperCase();

  if (!VALID_CONDITIONS.has(normalizedCondition)) {
    throw new Error(`Unsupported condition: ${condition}. Must be one of: ${[...VALID_CONDITIONS].join(', ')}`);
  }

  const modelConfig = MODEL_WEIGHTS[normalizedCondition];
  const features = extractFeatures(history, age_years);
  const riskScore = computeRiskScore(features, modelConfig);
  const riskLevel = classifyRisk(riskScore, modelConfig.thresholds);
  const followUpDays = modelConfig.follow_up_map[riskLevel];
  const reason = generateReason(features, riskLevel, normalizedCondition);

  return {
    risk_score: Number(riskScore.toFixed(4)),
    risk_level: riskLevel,
    follow_up_days: followUpDays,
    reason,
    features,
    condition: normalizedCondition,
    model_version: '1.0.0',
  };
}

module.exports = {
  extractFeatures,
  predictRisk,
};
