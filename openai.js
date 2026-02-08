import OpenAI from "openai";
import { generatePrompt } from "./prompt.js";

// API Key fallback: INPUT_OPENAI_API_KEY is set by GitHub Actions from inputs
const apiKey =
  process.env.OPENAI_API_KEY || process.env.INPUT_OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseLineComments = (content) => {
  try {
    // Extract JSON block from ```json...``` code fence
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      return [];
    }
    const jsonStr = jsonMatch[1].trim();
    const comments = JSON.parse(jsonStr);
    
    if (!Array.isArray(comments)) {
      console.warn("⚠️ Line comments is not an array, ignoring");
      return [];
    }
    
    // Validate structure
    return comments.filter(
      (c) =>
        c.path &&
        typeof c.path === "string" &&
        c.line &&
        typeof c.line === "number" &&
        c.body &&
        typeof c.body === "string"
    );
  } catch (err) {
    console.warn("⚠️ Failed to parse line comments:", err.message);
    return [];
  }
};

const callOpenAI = async (model, prompt, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      });
      return res.choices[0].message.content.trim();
    } catch (error) {
      const isRetryable =
        error.status === 429 ||
        error.status >= 500 ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";

      if (attempt < retries && isRetryable) {
        const delay = Math.pow(2, attempt) * 1000; // exponential backoff
        console.log(
          `⚠️ OpenAI API 호출 실패 (시도 ${attempt}/${retries}), ${delay}ms 후 재시도...`
        );
        await sleep(delay);
        continue;
      }

      // Final failure
      throw new Error(
        `OpenAI API 호출에 실패했습니다. 나중에 다시 시도해 주세요. (${error.message})`
      );
    }
  }
};

export const getReviewFromGPT = async (diff, options = {}) => {
  const {
    model = process.env.INPUT_OPENAI_MODEL || "gpt-4o-mini",
    reviewRole = "default",
    reviewMode = "summary",
  } = options;

  const prompt = generatePrompt(diff, { reviewRole, reviewMode });
  const content = await callOpenAI(model, prompt);

  // Parse based on review mode
  if (reviewMode === "summary") {
    return { summary: content, lineComments: [] };
  }

  if (reviewMode === "line" || reviewMode === "both") {
    // Split summary and line comments
    const lineComments = parseLineComments(content);
    
    // Remove JSON block from summary for cleaner output
    const summary = content.replace(/```json\s*[\s\S]*?\s*```/g, "").trim();
    
    return { summary, lineComments };
  }

  return { summary: content, lineComments: [] };
};
