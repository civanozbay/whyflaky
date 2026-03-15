import { Ollama } from "ollama";

const ollama = new Ollama({ host: "http://localhost:11434" });

// The model we'll use - codellama is great for code analysis
// User needs to run: ollama pull codellama
const MODEL = "codellama";

export interface AiResponse {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Send a prompt to the local Ollama instance
 * and stream the response back
 */
export async function askAI(prompt: string): Promise<AiResponse> {
  const MAX_CHARS = 8000;
  const safePrompt =
    prompt.length > MAX_CHARS
      ? prompt.slice(0, MAX_CHARS) + "\n\n[...truncated for length]"
      : prompt;
  try {
    const response = await ollama.chat({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert test engineer assistant. 
You help developers understand test failures, find root causes, and suggest fixes.
Be concise, practical, and specific. Always explain WHY something is failing, not just WHAT failed.
Format your response with clear sections: CAUSE, EXPLANATION, FIX.`,
        },
        {
          role: "user",
          content: safePrompt,
        },
      ],
    });

    return {
      success: true,
      text: response.message.content,
    };
  } catch (err: unknown) {
    // Ollama not running? Give helpful error
    const isConnectionError =
      err instanceof Error && err.message.includes("ECONNREFUSED");

    return {
      success: false,
      text: "",
      error: isConnectionError
        ? "Ollama is not running. Start it with: ollama serve\nThen pull the model: ollama pull codellama"
        : `AI error: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
