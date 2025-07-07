import express from 'express';
import multer from 'multer';
import { scoreResumeFromPath } from './script_resume.js';

const app = express();
const port = 3000;

// Configure multer to store uploaded PDFs in 'uploads/' folder
const upload = multer({ dest: 'uploads/' });

// POST route to handle resume scoring
app.post('/score-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const result = await scoreResumeFromPath(filePath);

    if (result) {
      res.json(result);
    } else {
      res.status(500).json({ error: 'Failed to score resume.' });
    }
  } catch (error) {
    console.error("🔥 Server error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Resume scoring API is live at http://localhost:${port}`);
});
