'use strict';

const path = require('node:path');

const { createChunkRecords, normalizeWhitespace } = require('./chunker');

const DEFAULT_PROTOCOL_PATH = path.resolve(__dirname, '../../../ml/protocols/imci.json');

function buildProtocolRuleText(rule, bundle) {
  const anySymptoms = Array.isArray(rule.symptomsAny) ? rule.symptomsAny.join(', ') : '';
  const allSymptoms = Array.isArray(rule.symptomsAll) ? rule.symptomsAll.join(', ') : '';

  return normalizeWhitespace(`
    Protocol source: ${bundle.source || 'unknown'}
    Protocol version: ${bundle.version || 'unknown'}
    Rule ID: ${rule.id}
    Priority: ${rule.priority}
    Age window: ${rule.min_age_months ?? 0} to ${rule.max_age_months ?? 'any'} months
    Urgency: ${rule.urgency}
    Symptoms (any): ${anySymptoms || 'none'}
    Symptoms (all): ${allSymptoms || 'none'}
    Reason: ${rule.reason || ''}
    Recommended action: ${rule.recommended_action || ''}
  `);
}

function loadProtocolBundle(protocolPath = DEFAULT_PROTOCOL_PATH) {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  return require(protocolPath);
}

function buildProtocolChunks(protocolPath) {
  const bundle = loadProtocolBundle(protocolPath);
  const rules = Array.isArray(bundle.rules) ? bundle.rules : [];
  const chunkRecords = [];

  for (const rule of rules) {
    const records = createChunkRecords({
      sourceType: 'protocol',
      sourceId: rule.id,
      patientId: null,
      title: `Protocol ${rule.urgency} rule`,
      section: 'imci_rule',
      text: buildProtocolRuleText(rule, bundle),
      timestamp: null,
    });
    chunkRecords.push(...records);
  }

  return {
    source: 'protocol',
    bundleVersion: bundle.version || null,
    chunks: chunkRecords,
  };
}

module.exports = {
  buildProtocolChunks,
  buildProtocolRuleText,
  loadProtocolBundle,
};
