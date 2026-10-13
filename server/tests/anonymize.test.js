const { anonymizeCandidate, sanitizeText } = require('../src/ai/anonymize');

describe('Rule R1: PII Anonymization Layer Unit Tests', () => {
  const sampleCandidate = {
    id: 'cand-uuid-12345',
    name: 'Sarah Connor',
    email: 'sarah.connor@cyberdyne.org',
    phone: '+216 98 123 456',
    experienceYears: 6,
    educationLevel: "Master's in Computer Engineering",
    skills: 'React, Node.js, Express, Docker, PostgreSQL',
    cvText: `Sarah Connor
Email: sarah.connor@cyberdyne.org | Mobile: +216 98 123 456
Address: 124 Cyberdyne Boulevard, Tunis 1002

Professional Summary:
I am Sarah Connor, a software engineer with 6 years building distributed backend architectures.
At Cyberdyne Systems, Sarah led the migration from monolithic architecture to containerized microservices.
Contact me at sarah.connor@cyberdyne.org for inquiries.`,
  };

  it('should scrub full name and name parts from CV text', () => {
    const { sanitizedText, scrubbedCount } = sanitizeText(
      sampleCandidate.cvText,
      sampleCandidate.name
    );

    expect(sanitizedText).not.toContain('Sarah Connor');
    expect(sanitizedText).toContain('Candidate A');
    expect(scrubbedCount.names).toBeGreaterThanOrEqual(1);
  });

  it('should scrub all email occurrences', () => {
    const { sanitizedText, scrubbedCount } = sanitizeText(
      sampleCandidate.cvText,
      sampleCandidate.name
    );

    expect(sanitizedText).not.toContain('sarah.connor@cyberdyne.org');
    expect(sanitizedText).toContain('[EMAIL_REDACTED]');
    expect(scrubbedCount.emails).toBe(2);
  });

  it('should scrub phone numbers', () => {
    const { sanitizedText, scrubbedCount } = sanitizeText(
      sampleCandidate.cvText,
      sampleCandidate.name
    );

    expect(sanitizedText).not.toContain('+216 98 123 456');
    expect(sanitizedText).toContain('[PHONE_REDACTED]');
    expect(scrubbedCount.phones).toBeGreaterThanOrEqual(1);
  });

  it('should scrub physical street addresses', () => {
    const { sanitizedText, scrubbedCount } = sanitizeText(
      sampleCandidate.cvText,
      sampleCandidate.name
    );

    expect(sanitizedText).not.toContain('124 Cyberdyne Boulevard');
    expect(sanitizedText).toContain('[ADDRESS_REDACTED]');
    expect(scrubbedCount.addresses).toBeGreaterThanOrEqual(1);
  });

  it('should generate compliant anonymized payload with audit trail', () => {
    const { anonymized, auditLog } = anonymizeCandidate(sampleCandidate);

    // Anonymized payload verification
    expect(anonymized.identifier).toBe('Candidate A');
    expect(anonymized).not.toHaveProperty('name');
    expect(anonymized).not.toHaveProperty('email');
    expect(anonymized).not.toHaveProperty('phone');
    expect(anonymized.experienceYears).toBe(6);
    expect(anonymized.skills).toContain('React');
    expect(anonymized.educationLevel).toBe("Master's in Computer Engineering");
    expect(anonymized.anonymizedCvText).not.toContain('Sarah Connor');

    // Audit log verification
    expect(auditLog.originalCandidateId).toBe(sampleCandidate.id);
    expect(auditLog.removedFields).toEqual(['name', 'email', 'phone']);
    expect(auditLog.scrubbedCount.emails).toBeGreaterThanOrEqual(1);
    expect(auditLog.ruleEnforced).toContain('Rule R1');
  });
});
