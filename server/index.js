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
        // Send the file to OpenAI's Whisper model (using your existing OpenAI client)
        // NOTE: Ensure your OpenAI initialization variable is named 'openaiClient' 
        // or change this variable to match yours!
        const transcription = await openaiClient.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-1',
        });
        
        console.log(`✅ Transcription complete!`);
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

    const systemPrompt = `You are an elite sales engineering AI. Extract a strictly valid JSON object from the transcript with the following shape:\n{
  "repName": string,
  "accountName": string,
  "dealStage": string,
  "overallRiskScore": number,
  "meddicCompleteness": number,
  "meddicData": object,
  "objectionsData": array
}\nReturn JSON only.`;

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