const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const groqClient = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;
const geminiClient1 = process.env.GEMINI_API_KEY_1 ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1) : null;
const geminiClient2 = process.env.GEMINI_API_KEY_2 ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2) : null;
const geminiClient3 = process.env.GEMINI_API_KEY_3 ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY_3) : null;
const geminiClient4 = process.env.GEMINI_API_KEY_4 ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY_4) : null;

for (const envName of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[envName]) {
    console.warn(`Environment variable ${envName} is not set.`);
  }
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Argus AI Backend is live.' });
});

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeAnalysisData(aiData) {
  const accountIntel = safeObject(aiData.accountIntel);
  const meddic = safeObject(aiData.meddic);
  const objectionAnalysis = safeObject(aiData.objectionAnalysis);
  const dealIntelligence = safeObject(aiData.dealIntelligence);
  const repCoaching = safeObject(aiData.repCoaching);

  return {
    accountIntel: {
      repName: typeof accountIntel.repName === 'string' && accountIntel.repName.trim() ? accountIntel.repName.trim() : 'Unknown Rep',
      accountName: typeof accountIntel.accountName === 'string' && accountIntel.accountName.trim() ? accountIntel.accountName.trim() : 'Unknown Account',
      dealStageAssessment: typeof accountIntel.dealStageAssessment === 'string' && accountIntel.dealStageAssessment.trim() ? accountIntel.dealStageAssessment.trim() : 'Unknown',
    },
    meddic: {
      completenessScore: Math.max(0, Math.min(100, Math.trunc(safeNumber(meddic.completenessScore, 0)))),
      elements: safeObject(meddic.elements),
    },
    objectionAnalysis: {
      overallHandlingScore: Math.max(0, Math.min(10, safeNumber(objectionAnalysis.overallHandlingScore, 0))),
      objections: safeArray(objectionAnalysis.objections),
    },
    dealIntelligence: {
      riskScore: Math.max(0, Math.min(10, safeNumber(dealIntelligence.riskScore, 0))),
      riskFactors: safeArray(dealIntelligence.riskFactors),
      competitorMentions: safeArray(dealIntelligence.competitorMentions),
      buyingSignals: safeArray(dealIntelligence.buyingSignals),
      nextActions: safeArray(dealIntelligence.nextActions),
    },
    repCoaching: {
      estimatedTalkRatio: typeof repCoaching.estimatedTalkRatio === 'string' && repCoaching.estimatedTalkRatio.trim() ? repCoaching.estimatedTalkRatio.trim() : '—',
      questionQuality: {
        openEndedExamples: safeArray(repCoaching.questionQuality?.openEndedExamples),
        closedExamples: safeArray(repCoaching.questionQuality?.closedExamples),
      },
      top3CoachingPoints: safeArray(repCoaching.top3CoachingPoints),
    },
  };
}

function extractSummaryFields(analysisData) {
  return {
    repName: analysisData.accountIntel.repName,
    accountName: analysisData.accountIntel.accountName,
    dealStage: analysisData.accountIntel.dealStageAssessment,
    overallRiskScore: analysisData.dealIntelligence.riskScore,
    meddicCompleteness: analysisData.meddic.completenessScore,
    meddicData: analysisData.meddic,
    objectionsData: analysisData.objectionAnalysis.objections,
  };
}

async function transcribeAudio(audioBuffer, originalFilename) {
  if (!groqClient) {
    throw new Error('Groq API key is missing.');
  }

  const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${originalFilename}`);
  fs.writeFileSync(tempFilePath, audioBuffer);

  try {
    const transcription = await groqClient.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-large-v3',
    });

    return transcription.text;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

async function extractWithWaterfall(transcriptText, systemPrompt) {
  const providers = [
    { id: 'OpenAI', type: 'openai', client: openaiClient, model: 'gpt-4o' },
    { id: 'Groq', type: 'openai', client: groqClient, model: 'llama-3.3-70b-versatile' },
    { id: 'Gemini Fleet 1', type: 'gemini', client: geminiClient1, model: 'gemini-2.5-flash' },
    { id: 'Gemini Fleet 2', type: 'gemini', client: geminiClient2, model: 'gemini-2.5-pro' },
    { id: 'Gemini Fleet 3', type: 'gemini', client: geminiClient3, model: 'gemini-2.0-flash' },
    { id: 'Gemini Fleet 4', type: 'gemini', client: geminiClient4, model: 'gemini-3-flash-preview' },
  ].filter((provider) => provider.client);

  for (const provider of providers) {
    try {
      console.log(`Attempting extraction via ${provider.id} (${provider.model})...`);
      let extractedDataStr = '';

      if (provider.type === 'openai') {
        const response = await provider.client.chat.completions.create({
          model: provider.model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Transcript:\n\n${transcriptText}` },
          ],
          temperature: 0.1,
        });
        extractedDataStr = response.choices[0].message.content;
      } else {
        const model = provider.client.getGenerativeModel({
          model: provider.model,
          systemInstruction: systemPrompt,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
        const result = await model.generateContent(`Transcript:\n\n${transcriptText}`);
        extractedDataStr = result.response.text();
      }

      return JSON.parse(extractedDataStr);
    } catch (error) {
      console.error(`Provider ${provider.id} failed: ${error.message}`);
    }
  }

  throw new Error('CRITICAL: The entire AI Waterfall collapsed. All models failed.');
}

app.post('/api/auth/signup', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
      },
    });

    return res.status(201).json({
      token: signToken(user),
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Signup failed:', error);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.status(200).json({
      token: signToken(user),
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Failed to login.' });
  }
});

app.post('/api/analyze', verifyToken, upload.single('transcript'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    let rawTranscriptText = '';
    let sourceType = 'text';

    if (req.file.mimetype === 'text/plain') {
      rawTranscriptText = req.file.buffer.toString('utf8');
    } else if (req.file.mimetype.startsWith('audio/')) {
      sourceType = 'audio';
      rawTranscriptText = await transcribeAudio(req.file.buffer, req.file.originalname);
    } else {
      return res.status(400).json({ error: 'Unsupported format. Please upload .txt, .mp3, or .wav' });
    }

    const systemPrompt = `
You are an elite Sales Intelligence AI. Your mission is to analyze B2B sales call transcripts and extract highly structured intelligence based on the MEDDIC framework, deal risk, objections, and rep coaching.

You MUST return a strictly valid JSON object. Do not include markdown formatting (like \`\`\`json), conversational text, or explanations. Return ONLY the JSON object.

### EXTRACTION RULES & RUBRICS:

1.  **Account Intel:** Identify the Sales Rep ("repName"), the Customer's Company ("accountName"), and the true "dealStageAssessment" based on the conversation context (e.g., Discovery, Needs Analysis, Negotiation, Closed).
2.  **MEDDIC Extraction:** Analyze the transcript for all 6 MEDDIC elements:
    * **M - Metrics:** Quantifiable business impact expected.
    * **E - Economic Buyer:** The person with budget/sign-off authority.
    * **D - Decision Criteria:** Technical or business requirements to evaluate options.
    * **D - Decision Process:** How and when the decision will be made.
    * **I - Identify Pain:** The specific problem driving the purchase.
    * **C - Champion:** The internal advocate selling on the rep's behalf.
    * *For each element, extract:* * "value": Summary of what was said (or null).
        * "confidence": "High", "Medium", "Low", or "None".
        * "quote": The exact verbatim quote from the transcript (or null).
        * "gapFlag": Boolean (true if missing or low confidence).
        * "gapRecommendation": A specific, scripted question the rep should ask next time to fill this gap (or null if confidence is High).
    * Calculate "completenessScore" as a percentage (0-100) of elements with High/Medium confidence.
3.  **Objection Analysis:** Identify explicit and implicit objections.
    * "category": Must be "Price", "Timing", "Competition", "Need", or "Authority".
    * "handlingStatus": Must be "Addressed", "Deflected", or "Missed".
    * "suggestedResponse": Provide a better, scripted response for the rep.
    * Provide an "overallHandlingScore" (1-10).
4.  **Deal Intelligence:**
    * "riskScore" (1-10): Overall deal health risk (1 = guaranteed win, 10 = lost).
    * "riskFactors": Array of 3 specific risk factors cited from the call.
    * "competitorMentions": Array of competitors named, the context, and if handled well (boolean).
    * "buyingSignals": Array of positive indicators (e.g., timeline questions).
    * "nextActions": Time-bound commitments made by either party.
5.  **Rep Coaching:**
    * "estimatedTalkRatio": Estimate the talk time percentage (e.g., "45% Rep / 55% Customer") based on word count.
    * "questionQuality": Extract 1-2 "openEndedExamples" and 1-2 "closedExamples" asked by the rep.
    * "top3CoachingPoints": Specific, actionable feedback based on this exact call.

### STRICT JSON SCHEMA:
{
  "accountIntel": {
    "repName": "string | null",
    "accountName": "string | null",
    "dealStageAssessment": "string"
  },
  "meddic": {
    "completenessScore": number,
    "elements": {
      "metrics": { "value": "string | null", "confidence": "High|Medium|Low|None", "quote": "string | null", "gapFlag": boolean, "gapRecommendation": "string | null" },
      "economicBuyer": { "value": "string | null", "confidence": "High|Medium|Low|None", "quote": "string | null", "gapFlag": boolean, "gapRecommendation": "string | null" },
      "decisionCriteria": { "value": "string | null", "confidence": "High|Medium|Low|None", "quote": "string | null", "gapFlag": boolean, "gapRecommendation": "string | null" },
      "decisionProcess": { "value": "string | null", "confidence": "High|Medium|Low|None", "quote": "string | null", "gapFlag": boolean, "gapRecommendation": "string | null" },
      "identifyPain": { "value": "string | null", "confidence": "High|Medium|Low|None", "quote": "string | null", "gapFlag": boolean, "gapRecommendation": "string | null" },
      "champion": { "value": "string | null", "confidence": "High|Medium|Low|None", "quote": "string | null", "gapFlag": boolean, "gapRecommendation": "string | null" }
    }
  },
  "objectionAnalysis": {
    "overallHandlingScore": number,
    "objections": [
      {
        "text": "string",
        "type": "Explicit|Implicit",
        "category": "Price|Timing|Competition|Need|Authority",
        "handlingStatus": "Addressed|Deflected|Missed",
        "suggestedResponse": "string"
      }
    ]
  },
  "dealIntelligence": {
    "riskScore": number,
    "riskFactors": ["string"],
    "competitorMentions": [
      { "competitorName": "string", "context": "string", "handledWell": boolean }
    ],
    "buyingSignals": ["string"],
    "nextActions": ["string"]
  },
  "repCoaching": {
    "estimatedTalkRatio": "string",
    "questionQuality": {
      "openEndedExamples": ["string"],
      "closedExamples": ["string"]
    },
    "top3CoachingPoints": ["string"]
  }
}
`;

    const aiData = await extractWithWaterfall(rawTranscriptText, systemPrompt);
    if (!aiData || typeof aiData !== 'object' || Array.isArray(aiData)) {
      return res.status(502).json({ error: 'AI returned an invalid JSON payload.' });
    }

    const analysisData = normalizeAnalysisData(aiData);
    const summary = extractSummaryFields(analysisData);

    const saved = await prisma.callAnalysis.create({
      data: {
        userId: req.user.userId,
        repName: summary.repName,
        accountName: summary.accountName,
        dealStage: summary.dealStage,
        overallRiskScore: summary.overallRiskScore,
        meddicCompleteness: summary.meddicCompleteness,
        rawTranscript: rawTranscriptText,
        analysisData,
        meddicData: summary.meddicData,
        objectionsData: summary.objectionsData,
      },
    });

    return res.status(200).json({
      message: 'Analysis saved',
      id: saved.id,
      sourceType,
      transcript: rawTranscriptText,
      data: analysisData,
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', verifyToken, async (req, res) => {
  try {
    const history = await prisma.callAnalysis.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        repName: true,
        accountName: true,
        dealStage: true,
        overallRiskScore: true,
        meddicCompleteness: true,
        rawTranscript: true,
        analysisData: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      items: history.map((item) => ({
        id: item.id,
        repName: item.repName,
        accountName: item.accountName,
        dealStage: item.dealStage,
        overallRiskScore: item.overallRiskScore,
        meddicCompleteness: item.meddicCompleteness,
        transcript: item.rawTranscript,
        analysisData: item.analysisData,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error('History lookup failed:', error);
    return res.status(500).json({ error: 'Failed to load call history.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
