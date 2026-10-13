/**
 * ====================================================
 * Rule R1: PII Anonymization Layer
 * server/src/ai/anonymize.js
 *
 * Enforces zero personal data transmission to external LLMs.
 * Removes/masks names, email addresses, phone numbers, and addresses.
 * Only transmits technical competencies, experience, education,
 * and sanitized text.
 * ====================================================
 */

// Regex patterns for detecting sensitive personal identifiable information (PII)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const ADDRESS_REGEX = /\b(\d{1,5}\s+[a-zA-Z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Rue|Avenue|Impasse))\b/gi;
const POSTAL_CODE_REGEX = /\b\d{4,5}\b/g;

/**
 * Anonymizes candidate text by replacing identified PII patterns with safe tokens.
 * @param {string} text - Raw CV or description text
 * @param {string} candidateName - Original candidate name to scrub
 * @returns {{ sanitizedText: string, scrubbedCount: Record<string, number> }}
 */
const sanitizeText = (text = '', candidateName = '') => {
  if (!text) return { sanitizedText: '', scrubbedCount: {} };

  let sanitized = text;
  const scrubbedCount = {
    names: 0,
    emails: 0,
    phones: 0,
    addresses: 0,
  };

  // 1. Scrub email addresses first (to prevent name replacements from altering email strings)
  const emailMatches = sanitized.match(EMAIL_REGEX);
  if (emailMatches) {
    scrubbedCount.emails += emailMatches.length;
    sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  }

  // 2. Scrub phone numbers (filter out short strings that could be years)
  const phoneMatches = sanitized.match(PHONE_REGEX);
  if (phoneMatches) {
    phoneMatches.forEach((match) => {
      if (match.trim().length >= 7) {
        scrubbedCount.phones += 1;
        sanitized = sanitized.replace(match, '[PHONE_REDACTED]');
      }
    });
  }

  // 3. Scrub physical street addresses
  const addressMatches = sanitized.match(ADDRESS_REGEX);
  if (addressMatches) {
    scrubbedCount.addresses += addressMatches.length;
    sanitized = sanitized.replace(ADDRESS_REGEX, '[ADDRESS_REDACTED]');
  }

  // 4. Scrub candidate name (full name and name parts)
  if (candidateName && candidateName.trim()) {
    const nameParts = candidateName.trim().split(/\s+/).filter((p) => p.length > 2);
    
    // Replace full name first
    const fullNameRegex = new RegExp(candidateName.trim(), 'gi');
    const matches = sanitized.match(fullNameRegex);
    if (matches) {
      scrubbedCount.names += matches.length;
      sanitized = sanitized.replace(fullNameRegex, 'Candidate A');
    }

    // Replace name parts
    nameParts.forEach((part) => {
      const partRegex = new RegExp(`\\b${part}\\b`, 'gi');
      const partMatches = sanitized.match(partRegex);
      if (partMatches) {
        scrubbedCount.names += partMatches.length;
        sanitized = sanitized.replace(partRegex, '[NAME_MASKED]');
      }
    });
  }


  return { sanitizedText: sanitized, scrubbedCount };
};

/**
 * Anonymize Candidate profile for LLM consumption
 * @param {object} candidate - Raw candidate record from database
 * @param {string} pseudonym - Masked identifier, default 'Candidate A'
 * @returns {{ anonymized: object, auditLog: object }}
 */
const anonymizeCandidate = (candidate, pseudonym = 'Candidate A') => {
  if (!candidate) {
    throw new Error('Candidate data is required for anonymization');
  }

  const { sanitizedText, scrubbedCount } = sanitizeText(
    candidate.cvText || '',
    candidate.name
  );

  const removedFields = [];
  if (candidate.name) removedFields.push('name');
  if (candidate.email) removedFields.push('email');
  if (candidate.phone) removedFields.push('phone');

  const auditLog = {
    pseudonym,
    originalCandidateId: candidate.id,
    timestamp: new Date().toISOString(),
    removedFields,
    scrubbedCount,
    ruleEnforced: 'Rule R1 (Zero Raw PII to External LLM)',
  };

  // Structured log for audit trail (Rule R1)
  console.log(`[RULE R1 ANONYMIZER] Successfully masked candidate '${candidate.id}'. Audit:`, {
    pseudonym,
    removedFields,
    scrubbedCount,
  });

  const anonymized = {
    identifier: pseudonym,
    experienceYears: candidate.experienceYears || 0,
    educationLevel: candidate.educationLevel || 'Not specified',
    skills: candidate.skills || '',
    anonymizedCvText: sanitizedText,
  };

  return {
    anonymized,
    auditLog,
  };
};

module.exports = {
  anonymizeCandidate,
  sanitizeText,
};
