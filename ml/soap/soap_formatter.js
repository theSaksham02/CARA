const keywordConfig = require("./keywords.json");

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s/%.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTranscriptIntoSentences(transcript) {
  if (!transcript || typeof transcript !== "string") return [];

  return transcript
    .split(/(?<!\d)\.\s+|[!?]\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function classifySentence(sentence) {
  const text = normalizeText(sentence);
  const priorityOrder = keywordConfig.priority_order || [
    "objective",
    "plan",
    "assessment",
    "subjective"
  ];

  for (const section of priorityOrder) {
    const keywords = keywordConfig[section]?.keywords || [];
    for (const keyword of keywords) {
      if (text.includes(normalizeText(keyword))) {
        return section;
      }
    }
  }

  return keywordConfig.metadata?.default_bucket || "subjective";
}

function classifySentences(sentences) {
  const soap = {
    subjective: [],
    objective: [],
    assessment: [],
    plan: []
  };

  for (const sentence of sentences) {
    const cleaned = sentence.trim();
    if (!cleaned) continue;

    const section = classifySentence(cleaned);
    soap[section].push(cleaned);
  }

  return soap;
}

function deduplicateSentences(sentences) {
  const seen = new Set();
  const result = [];

  for (const sentence of sentences) {
    const key = normalizeText(sentence);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(sentence);
    }
  }

  return result;
}

function ensureEndingPunctuation(sentence) {
  const trimmed = sentence.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function formatSection(sentences, fallbackText) {
  const cleaned = deduplicateSentences(sentences)
    .map(ensureEndingPunctuation)
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned.join(" ") : fallbackText;
}

function buildSections(transcript) {
  const sentences = splitTranscriptIntoSentences(transcript);
  const classified = classifySentences(sentences);

  return {
    subjective: formatSection(
      classified.subjective,
      "No subjective information provided."
    ),
    objective: formatSection(
      classified.objective,
      "No objective information provided."
    ),
    assessment: formatSection(
      classified.assessment,
      "No assessment information provided."
    ),
    plan: formatSection(
      classified.plan,
      "No plan information provided."
    )
  };
}

function formatSoapNote(transcript) {
  return buildSections(transcript);
}

function formatSOAP(transcript) {
  const sections = buildSections(transcript);

  return {
    S: sections.subjective,
    O: sections.objective,
    A: sections.assessment,
    P: sections.plan,
    flags: []
  };
}

function renderSOAPNote(soapObject) {
  return [
    "Subjective:",
    soapObject.subjective || soapObject.S || "No subjective information provided.",
    "",
    "Objective:",
    soapObject.objective || soapObject.O || "No objective information provided.",
    "",
    "Assessment:",
    soapObject.assessment || soapObject.A || "No assessment information provided.",
    "",
    "Plan:",
    soapObject.plan || soapObject.P || "No plan information provided."
  ].join("\n");
}

module.exports = {
  normalizeText,
  splitTranscriptIntoSentences,
  classifySentence,
  classifySentences,
  renderSOAPNote,
  formatSOAP,
  formatSoapNote
};