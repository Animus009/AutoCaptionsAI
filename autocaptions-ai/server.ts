import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Increase payload limit for large media base64 strings (supports up to 30 min audio/video)
app.use(express.json({ limit: "300mb" }));
app.use(express.urlencoded({ extended: true, limit: "300mb" }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "AutoCaptions AI Backend" });
});

// Candidate models in preference order (gemini-3.8-flash default, fallback to gemini-3.1-flash-lite and alias)
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  let lastError: any = null;

  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const model = CANDIDATE_MODELS[i];
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`[AutoCaptions AI] Model "${model}" failed:`, err?.status || err?.message || err);
      lastError = err;

      const isQuotaOrDemand =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.code === 429 ||
        err?.code === 503 ||
        String(err?.message || "").includes("429") ||
        String(err?.message || "").includes("503") ||
        String(err?.message || "").includes("RESOURCE_EXHAUSTED");

      // If quota or demand error, try next candidate model
      if (isQuotaOrDemand && i < CANDIDATE_MODELS.length - 1) {
        console.log(`[AutoCaptions AI] Switching from ${model} to fallback model ${CANDIDATE_MODELS[i + 1]}...`);
        continue;
      }

      // If not quota/demand error but another model is available, still attempt fallback
      if (i < CANDIDATE_MODELS.length - 1) {
        continue;
      }
    }
  }

  throw lastError;
}

function formatErrorMessage(error: any): string {
  if (!error) return "Failed to process video and generate captions";
  const rawMsg = error.message || String(error);

  if (
    error?.status === 429 ||
    rawMsg.includes("429") ||
    rawMsg.includes("RESOURCE_EXHAUSTED") ||
    rawMsg.includes("quota")
  ) {
    return "Gemini API free tier quota limit reached. Please wait ~30-40 seconds before retrying, or configure a paid key in Settings > Secrets.";
  }

  if (error?.status === 503 || rawMsg.includes("503") || rawMsg.includes("high demand")) {
    return "Gemini service is momentarily busy. Please try again in a few seconds.";
  }

  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {}

  return rawMsg;
}

// Gemini Caption Generation Endpoint
app.post("/api/generate-captions", async (req, res) => {
  try {
    const { mediaBase64, mimeType, targetLanguage, translateMode } = req.body;

    if (!mediaBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing mediaBase64 or mimeType parameter" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in environment variables. Please check Settings > Secrets.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let languageInstructions = "";
    if (targetLanguage === "hinglish") {
      languageInstructions = `
Target Language: HINGLISH (Hindi spoken language written in Roman/English Latin alphabet).
- Transcribe all Hindi or mixed Hindi-English speech using standard readable Latin text.
- Example: "Aaj hum baat karenge ki kaise aap simple video captions bana sakte ho."
- Do NOT use Devanagari script for Hinglish.
`;
    } else if (targetLanguage === "benglish") {
      languageInstructions = `
Target Language: BENGLISH (Bengali spoken language written in Roman/English Latin alphabet).
- Transcribe all Bengali or mixed Bengali-English speech using standard readable Latin text.
- Example: "Kemon acho shobai, ajke amra dekhbo ki bhabe video captions toiri kora jay."
- Do NOT use Bengali script for Benglish.
`;
    } else if (targetLanguage && targetLanguage !== "auto") {
      if (translateMode) {
        languageInstructions = `
Target Language: Translate speech from source video language into ${targetLanguage.toUpperCase()}.
- Transcribe and translate the spoken video content directly into fluent ${targetLanguage}.
`;
      } else {
        languageInstructions = `
Target Language: ${targetLanguage.toUpperCase()}.
- Transcribe the audio matching ${targetLanguage} orthography and script.
`;
      }
    } else {
      languageInstructions = `
Language: Auto-detect the primary language spoken in the video audio.
- Transcribe accurately in the natural language and script spoken in the video.
- If mixed Hindi and English is spoken, transcribe in Hinglish or standard Hindi as appropriate.
- If mixed Bengali and English is spoken, transcribe in Benglish or standard Bengali as appropriate.
`;
    }

    const promptText = `
You are an expert professional video subtitler and audio transcriber.
Analyze the provided video/audio recording carefully and create highly accurate time-stamped subtitles.

CRITICAL INSTRUCTIONS:
1. Break down the speech into natural, readable subtitle segments.
2. Each segment MUST have precise "start" time (in seconds as a float, e.g. 0.5) and "end" time (in seconds as a float, e.g. 3.2).
3. Segments should be short and concise (3 to 8 words per segment, lasting 1.5 to 4.0 seconds max).
4. Do NOT leave long silent gaps inside a caption segment.
5. Identify the detected language clearly in "detectedLanguage".
6. Provide a concise summary of the video content in "summary".
${languageInstructions}

OUTPUT FORMAT: Return strict JSON conforming to the requested schema.
`;

    // Clean base64 string if data URL prefix exists
    const cleanBase64 = mediaBase64.replace(/^data:[^;]+;base64,/, "");

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              description: "The detected primary language or script of the audio (e.g., Hinglish, Benglish, English, Hindi, Spanish)",
            },
            languageConfidence: {
              type: Type.NUMBER,
              description: "Confidence score between 0.0 and 1.0",
            },
            summary: {
              type: Type.STRING,
              description: "A 1-2 sentence summary of what is spoken in the video",
            },
            captions: {
              type: Type.ARRAY,
              description: "Ordered array of subtitle caption cues",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  start: { type: Type.NUMBER, description: "Start time in seconds (e.g. 1.25)" },
                  end: { type: Type.NUMBER, description: "End time in seconds (e.g. 3.80)" },
                  text: { type: Type.STRING, description: "Subtitle text for this cue" },
                  speaker: { type: Type.STRING, description: "Optional speaker label if multiple speakers" },
                },
                required: ["start", "end", "text"],
              },
            },
          },
          required: ["detectedLanguage", "captions"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const parsedData = JSON.parse(jsonText);

    // Post-process captions to ensure valid IDs and sorted timestamps
    if (Array.isArray(parsedData.captions)) {
      parsedData.captions = parsedData.captions.map((cap: any, index: number) => ({
        id: cap.id || `cap-${index + 1}`,
        start: Math.max(0, parseFloat(cap.start) || 0),
        end: Math.max(parseFloat(cap.start) + 0.5, parseFloat(cap.end) || parseFloat(cap.start) + 2.0),
        text: String(cap.text || "").trim(),
        speaker: cap.speaker ? String(cap.speaker).trim() : undefined,
      })).sort((a: any, b: any) => a.start - b.start);
    } else {
      parsedData.captions = [];
    }

    return res.json({
      success: true,
      detectedLanguage: parsedData.detectedLanguage || "Unknown",
      languageConfidence: parsedData.languageConfidence ?? 0.95,
      summary: parsedData.summary || "",
      captions: parsedData.captions,
    });
  } catch (error: any) {
    console.error("Error generating captions:", error);
    return res.status(500).json({
      error: formatErrorMessage(error),
    });
  }
});

// Endpoint to convert existing captions script format (Hinglish, Benglish, Devanagari, Bangla, English)
app.post("/api/convert-script", async (req, res) => {
  try {
    const { captions, targetScript } = req.body;

    if (!Array.isArray(captions) || captions.length === 0) {
      return res.status(400).json({ error: "No captions provided for conversion" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    let scriptInstruction = "";
    if (targetScript === "hinglish") {
      scriptInstruction = "Convert/transliterate all subtitle text into HINGLISH (Hindi written using English/Latin alphabet, e.g., 'Kaise ho aap', 'Mera naam Rahul hai'). Do NOT use Devanagari script.";
    } else if (targetScript === "benglish") {
      scriptInstruction = "Convert/transliterate all subtitle text into BENGLISH (Bengali written using English/Latin alphabet, e.g., 'Kemon acho shobai', 'Amra ekhon shuru korbo'). Do NOT use Bengali script.";
    } else if (targetScript === "hindi") {
      scriptInstruction = "Convert/translate all subtitle text into formal HINDI in native DEVANAGARI script (e.g., 'आप कैसे हैं', 'मेरा नाम राहुल है').";
    } else if (targetScript === "bengali") {
      scriptInstruction = "Convert/translate all subtitle text into formal BENGALI in native BANGLA script (e.g., 'আপনারা কেমন আছেন').";
    } else if (targetScript === "english") {
      scriptInstruction = "Translate all subtitle text into fluent ENGLISH.";
    } else {
      scriptInstruction = `Convert/translate all subtitle text into ${targetScript}.`;
    }

    const promptText = `
You are an expert multilingual subtitle translator and script converter.
Given an array of subtitle segments with "id" and "text", convert the "text" of each segment according to this rule:
${scriptInstruction}

CRITICAL RULES:
1. Retain the exact same "id" for each segment.
2. Keep the meaning accurate and short for video captions.
3. Return strict JSON array matching the schema.
`;

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          text: JSON.stringify(captions.map((c: any) => ({ id: c.id, text: c.text }))),
        },
        {
          text: promptText,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ["id", "text"],
          },
        },
      },
    });

    const convertedArray = JSON.parse(response.text || "[]");
    const convertedMap = new Map(convertedArray.map((item: any) => [item.id, item.text]));

    const updatedCaptions = captions.map((cap: any) => ({
      ...cap,
      text: convertedMap.get(cap.id) || cap.text,
    }));

    return res.json({
      success: true,
      captions: updatedCaptions,
      targetScript,
    });
  } catch (err: any) {
    console.error("Error converting caption script:", err);
    return res.status(500).json({ error: formatErrorMessage(err) });
  }
});

async function startServer() {
  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AutoCaptions AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
