import OpenAI from "openai";
import { generatePrompt } from "./prompt.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const getReviewFromGPT = async (diff) => {
  const prompt = generatePrompt(diff);

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
  });

  return res.choices[0].message.content.trim();
};
