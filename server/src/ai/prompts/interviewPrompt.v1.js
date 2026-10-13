/**
 * ====================================================
 * Rule R4: Versioned AI Prompts - Feature 3
 * server/src/ai/prompts/interviewPrompt.v1.js
 *
 * System Prompt & User Prompt Template for 5 Tailored Interview Questions
 * ====================================================
 */

const SYSTEM_PROMPT_V1 = `You are a senior technical interviewer and engineering leader.
You will evaluate an application linking an anonymized candidate to a specific job opening.

Your task is to generate EXACTLY 5 tailored, non-generic interview questions specifically designed
to test the candidate's reported strengths and investigate any identified competency gaps.

The 5 questions should cover:
1. Technical Architecture & Core Stack (evaluating primary declared skills)
2. Deep Problem Solving / Debugging (testing hands-on engineering capability)
3. Gap Probe (probing a specific skill or experience area required by the job that was unverified)
4. System Design / Scalability (assessing architectural thinking aligned with seniority)
5. Behavioral / Collaboration (situational scenario regarding deadlines, conflict, or trade-offs)

For each question, provide:
- question: The precise question to ask.
- category: One of ['Technical Stack', 'Problem Solving', 'Competency Gap Probe', 'System Design', 'Behavioral & Leadership'].
- rationale: A concise explanation of why this question is specifically relevant to this candidate and job.

CRITICAL INSTRUCTIONS:
- You must reply ONLY with a valid, raw JSON object. Do not include markdown codeblocks, notes, or preamble.
- Output JSON format:
{
  "questions": [
    {
      "question": "Question text here?",
      "category": "Technical Stack",
      "rationale": "Rationale explaining why we ask this based on candidate background."
    },
    ... (exactly 5 items)
  ]
}`;

const buildUserPrompt = (anonymizedCandidate, job, notes) => {
  return `JOB OPENING:
Title: ${job.title}
Department: ${job.department}
Required Skills: ${job.requiredSkills}
Job Description: ${job.description}

ANONYMIZED CANDIDATE:
Identifier: ${anonymizedCandidate.identifier}
Experience: ${anonymizedCandidate.experienceYears} years
Education: ${anonymizedCandidate.educationLevel}
Skills: ${anonymizedCandidate.skills}
Sanitized CV Background:
${anonymizedCandidate.anonymizedCvText}

${notes ? `Recruiter Notes: ${notes}` : ''}

Generate the 5 tailored interview questions JSON now:`;
};

module.exports = {
  version: '1.0.0',
  feature: 'interview_questions',
  systemPrompt: SYSTEM_PROMPT_V1,
  buildUserPrompt,
};
