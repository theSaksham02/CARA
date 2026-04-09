const fs = require('fs');
const path = require('path');

// Load keywords
const keywordsPath = path.join(__dirname, 'keywords.json');
let keywords = {};
try {
  keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));
} catch (err) {
  console.error('Error loading keywords.json', err);
}

/**
 * Parses a transcript into SOAP sections based on keyword matching.
 * @param {string} transcript The spoken consultation text
 * @returns {object} Object containing S, O, A, P arrays of sentences and any flags
 */
function formatSOAP(transcript) {
  const result = {
    S: [],
    O: [],
    A: [],
    P: [],
    flags: []
  };

  if (!transcript) return result;

  // Simple sentence splitting (handles periods, exclamation, question marks)
  const sentences = transcript.split(/(?<=[.!?])\s+/);

  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    let categorized = false;

    // Check Plan first (often most actionable)
    if (keywords.plan && keywords.plan.some(kw => lowerSentence.includes(kw))) {
      result.P.push(sentence);
      categorized = true;
    } 
    // Then Assessment
    else if (keywords.assessment && keywords.assessment.some(kw => lowerSentence.includes(kw))) {
      result.A.push(sentence);
      categorized = true;
    }
    // Then Objective
    else if (keywords.objective && keywords.objective.some(kw => lowerSentence.includes(kw))) {
      result.O.push(sentence);
      categorized = true;
    }
    // Then Subjective
    else if (keywords.subjective && keywords.subjective.some(kw => lowerSentence.includes(kw))) {
      result.S.push(sentence);
      categorized = true;
    }
    
    // Default to Subjective if no keywords match (it's usually history/story)
    if (!categorized) {
      result.S.push(sentence);
    }

    // Flag danger words across all sections
    const dangerWords = ['unconscious', 'convulsions', 'lethargic', 'unable to drink', 'stridor', 'chest indrawing'];
    dangerWords.forEach(danger => {
      if (lowerSentence.includes(danger) && !result.flags.includes(danger)) {
        result.flags.push(danger);
      }
    });
  });

  // Join arrays into strings for final output
  return {
    S: result.S.join(' '),
    O: result.O.join(' '),
    A: result.A.join(' '),
    P: result.P.join(' '),
    flags: result.flags
  };
}

module.exports = { formatSOAP };

// Simple CLI test if run directly
if (require.main === module) {
  const testTranscript = "The mother says the 3 year old boy has had a cough for 4 days and fever since yesterday. Temperature measured at 39 degrees celsius. Exam shows fast breathing but no chest indrawing. Suspected mild pneumonia. Give oral amoxicillin for 5 days and advise mother to return if symptoms worsen.";
  console.log(formatSOAP(testTranscript));
}
