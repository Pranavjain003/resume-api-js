import fs from 'fs';
import pdfParse from 'pdf-parse';
import * as dotenv from 'dotenv';
import * as genAI from '@google/generative-ai';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("❌ GOOGLE_API_KEY not set in .env");
}

const MODEL = "models/gemini-1.5-flash";
const genAIClient = new genAI.GoogleGenerativeAI(apiKey);

const model = genAIClient.getGenerativeModel({
  model: MODEL,
  systemInstruction: `You must respond only with valid JSON in this exact format:
{
  "name": "string",
  "age": number,
  "skills": ["string", "string"],
  "score": number
}`,
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        skills: {
          type: "array",
          items: { type: "string" }
        },
        score: { type: "number" }
      },
      required: ["name", "age", "score"]
    }
  }
});

const pdfPath = './resume1.pdf';

// Extract text from PDF
async function extractTextFromPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// Send resume to Gemini and parse result
async function scoreResumeWithLLM(resumeText) {
  const prompt = `
You are an intelligent resume evaluator. Given the resume text below, extract key candidate details and assign a **quality score between 0.0 and 1.0**. Be precise and strict in evaluation — do not award score if evidence is weak or missing.

Only extract the following fields in valid JSON format:

- name
- age (estimate if missing)
- skills (as array of strings)
- score (float between 0.0–1.0 based on rubric below)

Scoring Criteria (Max 20 points → normalized):

🔍 Profile Depth & Quality (10 pts)
- 2–3 focused domains (e.g., ML, web, systems) → +4  
- 6+ unrelated areas → −2  
- Skills backed by real projects → +5  
- Skills with no project evidence → 0  
- Clean formatting → +3  
- Poor formatting → −3  

💼 Technical Strength (6 pts)
- GitHub or portfolio with real projects → +5  
- Missing/empty links → 0  
- Certifications → +2  
- Hackathons/societies → +2  

🎓 Academic Background (4 pts)
- Tier 1 college → +4  
- Tier 2 → +2  
- Tier 3/unknown → 0  

📌 Normalize total score as: round(raw_score / 20, 2)
Strictly respond with JSON having only "name", "age", "skills", and "score".

Resume:
\`\`\`
${resumeText}
\`\`\`
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    console.log("🧠 Raw LLM Output:\n", text);

    if (text.startsWith("```json")) text = text.replace(/^```json/, "").trim();
    if (text.endsWith("```")) text = text.slice(0, -3).trim();

    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error("❌ Error:", error);
    return null;
  }
}

// Main runner
(async () => {
  try {
    const resumeText = await extractTextFromPDF(pdfPath);
    const scoredData = await scoreResumeWithLLM(resumeText);

    if (scoredData) {
      console.log("\n✅ Final Scored Resume JSON:\n", JSON.stringify(scoredData, null, 2));
      fs.appendFileSync("scored_resumes.json", JSON.stringify(scoredData, null, 2) + ",\n");
    } else {
      console.log("❌ Failed to process resume.");
    }
  } catch (err) {
    console.error("🔥 Fatal error:", err.message);
  }
})();

export async function scoreResumeFromPath(filePath) {
  const resumeText = await extractTextFromPDF(filePath);
  const scoredData = await scoreResumeWithLLM(resumeText);
  return scoredData;
}
