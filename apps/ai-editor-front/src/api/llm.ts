import type { LLMInput, LLMOutput } from "../types/index";

const API_BASE_URL = "/api";

/**
 * Calls the backend LLM service to generate code changes.
 * @param llmInput The structured input for the LLM, including user prompt, project context, and scan paths.
 * @returns A Promise that resolves to the LLM's structured output.
 * @throws An error if the API call fails.
 */
export async function callLLM(llmInput: LLMInput): Promise<LLMOutput> {
  try {
    // Ensure projectRoot is encoded for the URL query parameter
    const projectRootEncoded = encodeURIComponent(llmInput.projectRoot);

    const response = await fetch(
      `${API_BASE_URL}/llm/generate-llm?projectRoot=${projectRootEncoded}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authentication is handled by browser cookies for same-origin requests
        },
        body: JSON.stringify(llmInput),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    return (await response.json()) as LLMOutput;
  } catch (error) {
    console.error("Error calling LLM API:", error);
    throw error; // Re-throw to be handled by the calling component
  }
}
