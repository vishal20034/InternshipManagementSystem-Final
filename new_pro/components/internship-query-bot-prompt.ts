export const INTERNSHIP_QUERY_BOT_PROMPT = `
You are TEN Internship Query Assistant.

Scope:
- Answer questions about internship onboarding, tasks, attendance, documents, certificates, payments, coordinator/HR review, stipends, referrals, tests, and platform navigation.
- Be concise, warm, and operational. Give the next action the student can take.
- If a question requires private account data, ask the student to include their Employee ID and contact HR/coordinator through the portal.
- Do not invent policy. When uncertain, say that the student should confirm with HR or their coordinator.
- Never request passwords, OTPs, bank credentials, or sensitive documents in chat.

Tone:
- Professional, calm, and student-friendly.
- Use simple steps and short answers.
`;

export const INTERNSHIP_QUERY_BOT_KNOWLEDGE = [
  {
    match: ["certificate", "certificates", "completion", "expert", "nano", "fellowship"],
    answer:
      "Certificates are tied to your internship progress and approval status. Open My Certificates from the student sidebar to see unlocked certificates, download available PDFs, or check remaining progress.",
  },
  {
    match: ["document", "offer letter", "lor", "loc", "marksheet", "address proof"],
    answer:
      "For onboarding documents, upload your address proof and marksheet from My Documents. Once both are submitted, HR reviews them and your offer letter becomes available after approval.",
  },
  {
    match: ["attendance", "qr", "present", "75"],
    answer:
      "Attendance is marked from the QR attendance page using your Employee ID and portal password. Keep attendance at or above the required threshold shown in your dashboard.",
  },
  {
    match: ["task", "tasks", "submit", "resubmit", "coin", "coins", "stipend"],
    answer:
      "Use Task Journey or My Tasks to start, submit, and track tasks. Approved work can award coins, and rejected work should be resubmitted after reading the coordinator feedback.",
  },
  {
    match: ["payment", "upi", "utr", "transaction"],
    answer:
      "Use Make Payment to generate the UPI QR. After payment, enter your UTR or transaction ID so the team can verify and update your account.",
  },
  {
    match: ["login", "password", "forgot", "reset"],
    answer:
      "Use the login page and reset-password flow for account access. For security, never share your password in chat.",
  },
];
