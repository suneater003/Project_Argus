// server/index.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer'); // Import multer
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // set limit to size of the file to 5mb


const prisma = new PrismaClient();

const requiredEnvs = ['DATABASE_URL'];
for (const v of requiredEnvs) {
  if (!process.env[v]) console.warn(`Environment variable ${v} is not set.`);
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Argus AI Backend is live.' });
});

async function transcribeAudio(audioBuffer, originalFilename) {
  console.log(`\n🎧 Initializing Whisper Transcription for ${originalFilename}...`);
    
    
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${originalFilename}`);
    
    // Write the Multer memory buffer to this temporary file
    fs.writeFileSync(tempFilePath, audioBuffer);

    try {
      // --- PIVOT TO GROQ WHISPER ---
      const transcription = await groqClient.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
        model: 'whisper-large-v3', // Groq's blazing fast whisper model
        });
        
      console.log(`✅ Groq Transcription complete!`);
        return transcription.text;

    } catch (error) {
        console.error(`❌ Whisper Transcription failed: ${error.message}`);
        throw new Error('Failed to transcribe audio.');
    } finally {
        
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}

app.post('/api/analyze', upload.single('transcript'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    let rawTranscriptText = '';
    let sourceType = 'text';

    
    if (req.file.mimetype === 'text/plain') {
      console.log('📄 Text file detected.');
      rawTranscriptText = req.file.buffer.toString('utf8');
    } else if (req.file.mimetype.startsWith('audio/')) {
      console.log('🎵 Audio file detected. Routing to Whisper...');
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

    // 1. Send text to Waterfall models
    let aiData = null;
    try {
      aiData = await extractWithWaterfall(rawTranscriptText, systemPrompt);
    } catch (aiErr) {
      console.error('AI extraction failed:', aiErr);
      return res.status(502).json({ error: 'AI extraction failed.' });
    }

    // 2. Validate and normalize AI output for Prisma
    if (!aiData || typeof aiData !== 'object' || Array.isArray(aiData)) {
      return res.status(502).json({ error: 'AI returned an invalid JSON payload.' });
    }

    const repName = typeof aiData.repName === 'string' && aiData.repName.trim() ? aiData.repName.trim() : 'Unknown Rep';
    const accountName = typeof aiData.accountName === 'string' && aiData.accountName.trim() ? aiData.accountName.trim() : 'Unknown Account';
    const dealStage = typeof aiData.dealStage === 'string' && aiData.dealStage.trim() ? aiData.dealStage.trim() : 'Unknown';

    const overallRiskScoreRaw = aiData.overallRiskScore ?? aiData.riskScore ?? 0;
    const overallRiskScore = Number.isFinite(Number(overallRiskScoreRaw)) ? Number(overallRiskScoreRaw) : 0;

    const meddicCompletenessRaw = aiData.meddicCompleteness ?? 0;
    const meddicCompleteness = Number.isFinite(Number(meddicCompletenessRaw)) ? Math.trunc(Number(meddicCompletenessRaw)) : 0;

    const meddicData = aiData.meddicData && typeof aiData.meddicData === 'object' && !Array.isArray(aiData.meddicData)
      ? aiData.meddicData
      : (aiData.meddic && typeof aiData.meddic === 'object' && !Array.isArray(aiData.meddic) ? aiData.meddic : {});

    const objectionsData = Array.isArray(aiData.objectionsData)
      ? aiData.objectionsData
      : (Array.isArray(aiData.objections) ? aiData.objections : []);

    // save data to DB with Prisma here
    let saved = null;
    try {
      saved = await prisma.callAnalysis.create({
        data: {
          repName,
          accountName,
          dealStage,
          overallRiskScore,
          meddicCompleteness,
          rawTranscript: rawTranscriptText,
          meddicData,
          objectionsData
        }
      });
    } catch (dbErr) {
      console.error('DB save failed:', dbErr);
      return res.status(500).json({ error: 'Failed to save analysis to database.' });
    }

    return res.status(200).json({
      message: 'Analysis saved',
      id: saved.id,
      sourceType,
      transcript: rawTranscriptText,
      data: aiData
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// server/aiService.js
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Initialize OpenAI and Groq
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groqClient = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY, 
    baseURL: "https://api.groq.com/openai/v1" 
});

// 2. Initialize Gemini Clients (One for each key)
const geminiClient1 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1);
const geminiClient2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2);
const geminiClient3 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_3);
const geminiClient4 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_4);

async function extractWithWaterfall(transcriptText, systemPrompt) {
    // 3. The Fallback Roster: Ordered from Primary to Final Fallback
    const providers = [
        { id: "OpenAI", type: "openai", client: openaiClient, model: "gpt-4o" },
        { id: "Groq", type: "openai", client: groqClient, model: "llama-3.3-70b-versatile" },
        { id: "Gemini Fleet 1", type: "gemini", client: geminiClient1, model: "gemini-2.5-flash" },
        { id: "Gemini Fleet 2", type: "gemini", client: geminiClient2, model: "gemini-2.5-pro" },
        { id: "Gemini Fleet 3", type: "gemini", client: geminiClient3, model: "gemini-2.0-flash" },
        { id: "Gemini Fleet 4", type: "gemini", client: geminiClient4, model: "gemini-3-flash-preview" }
    ];

    // 4. The Execution Loop
    for (const provider of providers) {
        try {
            console.log(`\n🤖 Attempting extraction via: ${provider.id} (${provider.model})...`);

            let extractedDataStr = "";

            // --- OPENAI / GROQ LOGIC ---
            if (provider.type === "openai") {
                const response = await provider.client.chat.completions.create({
                    model: provider.model,
                    response_format: { type: "json_object" }, 
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Transcript:\n\n${transcriptText}` }
                    ],
                    temperature: 0.1
                });
                extractedDataStr = response.choices[0].message.content;
            } 
            
            
            else if (provider.type === "gemini") {
                const model = provider.client.getGenerativeModel({
                    model: provider.model,
                    systemInstruction: systemPrompt,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1,
                    }
                });
                const result = await model.generateContent(`Transcript:\n\n${transcriptText}`);
                extractedDataStr = result.response.text();
            }

            console.log(`✅ Success! Data extracted by ${provider.id}`);
            
            // Convert the string into a JavaScript Object and return it instantly without much delay
            return JSON.parse(extractedDataStr);

        } catch (error) {
            // If the model fails, we log it and the loop naturally moves to the next provider untill every model fails
            console.error(`❌ ${provider.id} failed. Error: ${error.message}`);
            console.log(`🔄 Waterfall cascading to next provider...`);
        }
    }

    
    throw new Error("CRITICAL: The entire AI Waterfall collapsed. All models failed.");
}

module.exports = { extractWithWaterfall };