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
const model = genAIClient.getGenerativeModel({ model: MODEL });


const pdfPath = './resume1.pdf';

// Function to extract text from PDF
async function extractTextFromPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// Function to send resume to Gemini and parse the result
async function scoreResumeWithLLM(resumeText) {
  const prompt = `
You are an intelligent resume evaluator. Given the resume text below, extract key candidate details and assign a **quality score between 0.0 and 1.0**. Be precise and strict in evaluation — do not award score if evidence is weak or missing.

---

📄 Return the following as valid JSON:

- name
- education
- experience_summary
- skills (list)
- projects_summary
- github_or_portfolio_links (list)
- certifications (list)
- participation (societies, hackathons, etc.)
- score (float between 0.0 and 1.0)
- tier: "high" (score ≥ 0.75), "medium" (0.4–0.74), "low" (≤ 0.39)
- tags (list): choose from ["focused", "project_ready", "poor_formatting", "incomplete", "well_presented", "github_present", "certified", "inactive_profile", "diverse_skills", "academic"]

---

📊 Scoring Criteria (Max 20 raw points → normalized to 0.0–1.0):

🔍 **Profile Depth & Quality (10 pts)**
- 2–3 focused domains (e.g., ML, web, systems) → +4  
- 6+ unrelated areas → −2  
- Skills backed by real projects → +5  
- Skills with no project evidence → 0  
- Clean formatting and structure → +3  
- Poor formatting or messy resume → −3  

💼 **Technical Strength (6 pts)**
- GitHub or portfolio with real projects → +5  
- Missing or empty links → 0  
- Certifications (Coursera, Google, etc.) → +2  
- Participation in hackathons/societies → +2  

🎓 **Academic Background (4 pts)**
- Tier 1 college → +4  
- Tier 2 → +2  
- Tier 3/unknown → 0  

---

📌 Instructions:
- Normalize total score: \`normalized_score = round(raw_score / 20, 2)\`
- Strictly extract GitHub/portfolio URLs — do NOT guess.
- If info is missing, leave field empty or null.
- Respond with valid JSON only.

---

📝 Resume Content:
\`\`\`
${resumeText}
\`\`\`
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    console.log("🧠 Raw LLM Output:\n", text);

    if (text.startsWith("```json")) {
      text = text.replace(/^```json/, "").trim();
    }
    if (text.endsWith("```")) {
      text = text.slice(0, -3).trim();
    }

    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error("❌ Error:", error);
    return null;
  }
}

// Main runner
// (async () => {
//   try {
//     const resumeText = await extractTextFromPDF(pdfPath);
//     const scoredData = await scoreResumeWithLLM(resumeText);

//     if (scoredData) {
//       console.log("\n✅ Final Scored Resume JSON:\n", JSON.stringify(scoredData, null, 2));

//       // Optional: save to database or file
//       fs.appendFileSync("scored_resumes.json", JSON.stringify(scoredData, null, 2) + ",\n");
//     } else {
//       console.log("❌ Failed to process resume.");
//     }
//   } catch (err) {
//     console.error("🔥 Fatal error:", err.message);
//   }
// })();
export async function scoreResumeFromPath(filePath) {
  const resumeText = await extractTextFromPDF(filePath);
  const scoredData = await scoreResumeWithLLM(resumeText);
  return scoredData;
}
