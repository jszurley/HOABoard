/**
 * Content moderation utility for board questions.
 * Checks text for offensive language, threats, and combative tone.
 * If flagged, the question is forced to private with a reason.
 */

// Profanity / slurs (partial list — catches common variations with optional letter substitutions)
const OFFENSIVE_WORDS = [
  'fuck', 'shit', 'ass', 'asshole', 'bitch', 'bastard', 'damn', 'crap',
  'dick', 'piss', 'cunt', 'whore', 'slut', 'retard', 'idiot', 'moron',
  'stupid', 'dumbass', 'jackass', 'douche', 'scumbag', 'dipshit',
  'bullshit', 'horseshit', 'wtf', 'stfu', 'gtfo', 'pos',
];

// Build regex that catches word boundaries and common letter substitutions
// e.g., "f*ck", "sh!t", "a$$"
const buildOffensiveRegex = (word) => {
  const substitutions = {
    a: '[a@4]',
    e: '[e3]',
    i: '[i1!]',
    o: '[o0]',
    s: '[s$5]',
    t: '[t7]',
  };
  const pattern = word
    .split('')
    .map((ch) => substitutions[ch] || ch)
    .join('[\\s.*_-]?'); // allow separators between letters
  return new RegExp(`\\b${pattern}\\b`, 'i');
};

const offensivePatterns = OFFENSIVE_WORDS.map(buildOffensiveRegex);

// Threatening / combative phrases
const THREAT_PHRASES = [
  /\b(i('ll| will|'m going to|'m gonna)\s+(kill|hurt|destroy|end|get|find)\s+(you|them|him|her))/i,
  /\b(watch your back|you('ll| will) (pay|regret)|come after you|know where you live)/i,
  /\b(i('ll| will)\s+sue|lawyer up|see you in court|legal action)/i,
  /\b(burn (it|this|the place) down|blow (it|this|up))/i,
  /\b(you('re| are)\s+(dead|done|finished))\b/i,
  /\b(shut (the fuck |your )?(up|mouth|face))\b/i,
  /\b(piece of (shit|crap|garbage|trash))\b/i,
];

// Combative / aggressive tone patterns
const COMBATIVE_PHRASES = [
  /\b(you people|all of you|every one of you)\s+(are|is)\s+(useless|worthless|incompetent|corrupt|crooked|garbage|trash)/i,
  /\b(worst (board|hoa|management|president|committee))\b/i,
  /\b(do your (damn|fucking|freaking) job)/i,
  /\b(what the (hell|fuck|heck) (is|are) (you|they|we))/i,
  /\b(sick (and tired|of this)|fed up|had enough|last straw)/i,
  /\b(demand|insist|or else|final warning)\b/i,
  /\b(you (better|should be) (watch|careful|afraid|ashamed|embarrassed))/i,
  /\b(how dare you|shame on you|disgusting|pathetic)\b/i,
];

// ALL CAPS detection (aggressive tone) — only flag if a significant portion is caps
const isExcessiveCaps = (text) => {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 20) return false; // too short to judge
  const capsCount = (text.match(/[A-Z]/g) || []).length;
  return capsCount / letters.length > 0.6;
};

/**
 * Moderate content and return flagging result.
 * @param {string} title - Question title
 * @param {string} message - Question message body
 * @returns {{ flagged: boolean, reasons: string[] }}
 */
function moderateContent(title, message) {
  const fullText = `${title} ${message}`;
  const reasons = [];

  // Check offensive words
  for (const pattern of offensivePatterns) {
    if (pattern.test(fullText)) {
      reasons.push('Contains offensive language');
      break; // one reason is enough for this category
    }
  }

  // Check threatening language
  for (const pattern of THREAT_PHRASES) {
    if (pattern.test(fullText)) {
      reasons.push('Contains threatening language');
      break;
    }
  }

  // Check combative tone
  for (const pattern of COMBATIVE_PHRASES) {
    if (pattern.test(fullText)) {
      reasons.push('Contains combative or aggressive tone');
      break;
    }
  }

  // Check excessive caps
  if (isExcessiveCaps(fullText)) {
    reasons.push('Excessive use of capital letters (aggressive tone)');
  }

  return {
    flagged: reasons.length > 0,
    reasons,
  };
}

module.exports = { moderateContent };
