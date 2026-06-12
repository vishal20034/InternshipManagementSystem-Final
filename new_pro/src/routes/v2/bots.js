const router            = require('express').Router();
const BotQuery          = require('../../../models/BotQuery');
const SystemKnowledge   = require('../../../models/SystemKnowledge');

// ─── Seed default knowledge if DB empty ──────────────────────────
const DEFAULT_KNOWLEDGE = [
  { topic: 'task_submission',     content: 'Submit daily tasks via the v2-tasks page. Earn coins for Daily Job Posting every day.' },
  { topic: 'attendance',          content: 'Mark attendance in your student dashboard. WhatsApp Re-Joiners must fill Google Form twice daily.' },
  { topic: 'certificates',        content: '2-step approval: Coordinator approves first, then HR. LOC at 100% completion, LOR at 50%+, Star Performance for top scorers.' },
  { topic: 'documents',           content: 'Upload Address Proof and Marksheet at my-documents page. Accepted: PDF/JPG/PNG under 5MB.' },
  { topic: 'offer_letter',        content: 'Offer letter generated after HR approves your uploaded documents. Auto-generated after 24hr delay.' },
  { topic: 'profile',             content: 'View your registration details including your password (masked) in the Profile modal on your dashboard.' },
  { topic: 'discord',             content: 'Join TEN alumni Discord: https://discord.gg/GYnZFbDE7. Find the QR code in the attendance section.' },
  { topic: 'login',               content: 'Login with your Employee ID and the password you registered with at the login page.' },
  { topic: 'joiner_type',         content: 'Select New Joiner or WhatsApp Re-Joiner on first login. This cannot be changed later.' },
  { topic: 'domains',             content: 'Available domains: Web Dev, Python, AI, Data Science, MERN, HR Management, Java, Flutter, Cyber Security, DevOps, Software Engineering.' },
  { topic: 'coins',               content: 'Earn coins by completing daily tasks. Coins are tracked on your dashboard.' },
  { topic: 'coordinator',         content: 'Your coordinator manages your tasks and approvals. Contact them via the Domain Chat feature.' },
  { topic: 'internship_duration', content: 'Standard internship is 45 days. Certificate issued after completion and HR approval.' },
  { topic: 'payment',             content: 'If you have payment queries, check the Payment section in your dashboard or contact HR.' },
];

async function seedKnowledge() {
  const count = await SystemKnowledge.countDocuments();
  if (count === 0) {
    await SystemKnowledge.insertMany(DEFAULT_KNOWLEDGE);
    console.log('[Bots] Default knowledge seeded.');
  }
}
seedKnowledge().catch(console.error);

// ─── Gemini API helper (Bypassed with local rules/random fallbacks for now) ───
async function askGemini(systemPrompt, userMessage) {
  const msg = String(userMessage || '').toLowerCase();
  
  // 1. Keyword checks matching default knowledge
  if (msg.includes('task') || msg.includes('submit')) {
    return 'Submit daily tasks via the v2-tasks page. Earn coins for Daily Job Posting every day.';
  }
  if (msg.includes('attendance') || msg.includes('present') || msg.includes('meeting')) {
    return 'Mark attendance in your student dashboard. WhatsApp Re-Joiners must fill Google Form twice daily.';
  }
  if (msg.includes('cert') || msg.includes('lor') || msg.includes('loc') || msg.includes('recommendation') || msg.includes('completion')) {
    return '2-step approval: Coordinator approves first, then HR. LOC at 100% completion, LOR at 50%+, Star Performance for top scorers.';
  }
  if (msg.includes('doc') || msg.includes('upload') || msg.includes('marksheet') || msg.includes('address')) {
    return 'Upload Address Proof and Marksheet at my-documents page. Accepted: PDF/JPG/PNG under 5MB.';
  }
  if (msg.includes('offer')) {
    return 'Offer letter generated after HR approves your uploaded documents. Auto-generated after 24hr delay.';
  }
  if (msg.includes('profile') || msg.includes('password') || msg.includes('detail')) {
    return 'View your registration details including your password (masked) in the Profile modal on your dashboard.';
  }
  if (msg.includes('discord') || msg.includes('link') || msg.includes('group') || msg.includes('chat')) {
    return 'Join TEN alumni Discord: https://discord.gg/GYnZFbDE7. Find the QR code in the attendance section.';
  }
  if (msg.includes('coin') || msg.includes('balance') || msg.includes('point')) {
    return 'Earn coins by completing daily tasks. Coins are tracked on your dashboard.';
  }
  if (msg.includes('coordinator') || msg.includes('review') || msg.includes('grade')) {
    return 'Your coordinator manages your tasks and approvals. Contact them via the Domain Chat feature.';
  }
  if (msg.includes('domain') || msg.includes('field') || msg.includes('domain list')) {
    return 'Available domains: Web Dev, Python, AI, Data Science, MERN, HR Management, Java, Flutter, Cyber Security, DevOps, Software Engineering.';
  }
  if (msg.includes('payment') || msg.includes('money') || msg.includes('refund') || msg.includes('fee')) {
    return 'If you have payment queries, check the Payment section in your dashboard or contact HR.';
  }
  if (msg.includes('duration') || msg.includes('days') || msg.includes('month') || msg.includes('period')) {
    return 'Standard internship is 45 days. Certificate issued after completion and HR approval.';
  }
  if (msg.includes('login') || msg.includes('credentials')) {
    return 'Login with your Employee ID and the password you registered with at the login page.';
  }
  
  // 2. Escalation trigger keywords
  if (msg.includes('hr') || msg.includes('help') || msg.includes('escalate') || msg.includes('admin') || msg.includes('error') || msg.includes('problem') || msg.includes('check my')) {
    return 'ESCALATE_TO_HR';
  }

  // 3. Fallback to a random supportive bot response
  const randomFallbacks = [
    'Please make sure to complete your standard domain tasks daily to build up your coin balance!',
    'All documents must be approved by the HR team before your official offer letter is issued.',
    'Reach out to your coordinator using the domain chat if you have any doubts about task descriptions.',
    'If you need immediate assistance with technical issues, feel free to submit a support query to HR.',
    'For attendance verification, ensure you scan the roster QR code regularly.'
  ];
  const randomIndex = Math.floor(Math.random() * randomFallbacks.length);
  return randomFallbacks[randomIndex];
}

// ─── Get all knowledge as context string ─────────────────────────
async function getKnowledgeContext() {
  const items = await SystemKnowledge.find({}).lean();
  return items.map(i => `[${i.topic}]: ${i.content}`).join('\n');
}

// ─── POST /api/v2/bots/task-bot ──────────────────────────────────
router.post('/task-bot', async (req, res) => {
  try {
    const { question, userType, userName, domain } = req.body;
    const userId = req.body.userId || req.body.employeeId;
    if (!question || !userId) {
      return res.status(400).json({ error: 'question and userId (or employeeId) required' });
    }

    const knowledge    = await getKnowledgeContext();
    const systemPrompt = `You are TEN Task Assistant, an AI embedded in the TEN Internship Portal.
Your job: answer ONLY questions about portal tasks, deadlines, attendance, documents, coins, certificates, and portal features.
Use the knowledge base below to answer accurately and specifically.
If the question is completely unrelated to the internship portal, respond: "Please ask me about your internship tasks or portal features."
Be concise (2-4 sentences max), friendly, and specific. Never make up information not in the knowledge base.

KNOWLEDGE BASE:
${knowledge}`;

    const answer = await askGemini(systemPrompt, question);
    await BotQuery.create({ userId, userType, userName, domain, botType: 'task', question, answer });
    return res.json({ answer });
  } catch (e) {
    console.error('[task-bot]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v2/bots/voice-bot ─────────────────────────────────
router.post('/voice-bot', async (req, res) => {
  try {
    const { question, userType, userName, domain } = req.body;
    const userId = req.body.userId || req.body.employeeId;
    if (!question || !userId) {
      return res.status(400).json({ error: 'question and userId (or employeeId) required' });
    }

    const systemPrompt = `You are TEN Voice Assistant, a helpful and smart AI for TEN Internship Portal students.
Answer any internship-related question clearly and concisely (voice-friendly: 1-3 short sentences).
Domain context: ${domain || 'General'}.
Be warm, professional, and helpful. Never say you cannot help — always give your best answer.`;

    const answer = await askGemini(systemPrompt, question);
    await BotQuery.create({ userId, userType, userName, domain, botType: 'voice', question, answer });
    return res.json({ answer });
  } catch (e) {
    console.error('[voice-bot]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v2/bots/query-bot ─────────────────────────────────
router.post('/query-bot', async (req, res) => {
  try {
    const { question, userType, userName, domain, coordinatorId } = req.body;
    const userId = req.body.userId || req.body.employeeId;
    if (!question || !userId) {
      return res.status(400).json({ error: 'question and userId (or employeeId) required' });
    }

    const knowledge    = await getKnowledgeContext();
    const systemPrompt = `You are TEN Support Bot for the TEN Internship Portal.
Answer student questions about their internship confidently using the knowledge base below.
If you TRULY cannot answer with confidence (question requires checking their specific account, HR approval status, or payment records), respond with ONLY this exact text: ESCALATE_TO_HR
Otherwise give a helpful, accurate answer in 2-4 sentences.

KNOWLEDGE BASE:
${knowledge}`;

    const answer          = await askGemini(systemPrompt, question);
    const needsEscalation = answer.trim() === 'ESCALATE_TO_HR';

    const record = await BotQuery.create({
      userId,
      userType,
      userName,
      domain,
      coordinatorId: coordinatorId || '',
      botType:       'query',
      question,
      answer:        needsEscalation ? null : answer,
      escalatedToHR: needsEscalation,
      status:        needsEscalation ? 'open' : 'answered',
    });

    return res.json({ 
      answer: needsEscalation ? null : answer, 
      reply: needsEscalation ? null : answer, 
      needsEscalation, 
      queryId: record._id 
    });
  } catch (e) {
    console.error('[query-bot]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v2/bots/escalate ──────────────────────────────────
router.post('/escalate', async (req, res) => {
  try {
    const { queryId, details, userId, userType, userName, domain, coordinatorId } = req.body;
    if (queryId) {
      await BotQuery.findByIdAndUpdate(queryId, {
        question:      details,
        escalatedToHR: true,
        coordinatorId: coordinatorId || '',
      });
    } else {
      const userId = req.body.userId || req.body.employeeId;
      await BotQuery.create({
        userId,
        userType,
        userName,
        domain,
        coordinatorId: coordinatorId || '',
        botType:       'query',
        question:      details,
        escalatedToHR: true,
        status:        'open',
      });
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v2/bots/hr/queries ─────────────────────────────────
router.get('/hr/queries', async (req, res) => {
  try {
    const filter = { escalatedToHR: true };
    if (req.query.domain) { filter.domain = req.query.domain; }
    if (req.query.status) { filter.status = req.query.status; }
    const queries = await BotQuery.find(filter).sort({ createdAt: -1 }).lean();

    const frequencyMap = {};
    queries.forEach(q => {
      const key = q.question.slice(0, 50).toLowerCase().replace(/\s+/g, ' ');
      if (!frequencyMap[key]) { frequencyMap[key] = { count: 0, sample: q }; }
      frequencyMap[key].count++;
    });
    const trending = Object.values(frequencyMap)
      .filter(f => f.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.json({ queries, trending, totalOpen: queries.filter(q => q.status === 'open').length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v2/bots/hr/answer ─────────────────────────────────
router.post('/hr/answer', async (req, res) => {
  try {
    const { queryId, hrAnswer, hrAnsweredBy } = req.body;
    if (!queryId || !hrAnswer) {
      return res.status(400).json({ error: 'queryId and hrAnswer required' });
    }
    const query = await BotQuery.findByIdAndUpdate(
      queryId,
      { hrAnswer, hrAnsweredBy, hrAnsweredAt: new Date(), status: 'answered' },
      { new: true }
    );
    if (!query) { return res.status(404).json({ error: 'Query not found' }); }

    try {
      const Notification = require('../../../models/Notification');
      await Notification.create({
        title:            '\u2705 Your Query Was Answered by HR',
        message:          `HR answered your question: "${hrAnswer}"`,
        type:             'info',
        from:             hrAnsweredBy || 'HR Team',
        targetType:       'student',
        targetEmployeeId: query.userId,
      });
    } catch (_e) { /* Notification model may differ — skip silently */ }

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v2/bots/knowledge/update ──────────────────────────
router.post('/knowledge/update', async (req, res) => {
  try {
    const { topic, content } = req.body;
    if (!topic || !content) {
      return res.status(400).json({ error: 'topic and content required' });
    }
    await SystemKnowledge.findOneAndUpdate(
      { topic },
      { content, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
