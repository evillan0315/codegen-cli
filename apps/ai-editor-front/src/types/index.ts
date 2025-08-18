export interface ScannedFile {
  filePath: string; // Absolute path to the file
  relativePath: string; // Path relative to the project root (e.g., "src/components/MyComponent.tsx")
  content: string;
}

/**
 * Represents a proposed change to a file.
 * This is the structured output we expect from the LLM.
 */
export interface ProposedFileChange {
  filePath: string; // Path relative to the project root (e.g., "src/components/MyComponent.tsx")
  action: "add" | "modify" | "delete";
  /**
   * For 'add' or 'modify' actions, this is the new content of the file.
   * For 'delete' actions, this field is not used.
   */
  newContent?: string;
  /**
   * An optional human-readable reason or summary for the change.
   */
  reason?: string;
}

/**
 * Represents the structured input that will be sent to the LLM.
 */
export interface LLMInput {
  userPrompt: string;
  projectRoot: string;
  projectStructure: string; // A high-level overview of the project directory (e.g., tree string)
  relevantFiles: ScannedFile[];
  additionalInstructions: string; // Specific behavioral instructions for the LLM
  expectedOutputFormat: string; // Instructions on the JSON format for the LLM's response
  scanPaths: string[]; // Added scanPaths for LLM context based on CLI changes
}

/**
 * Represents the structured output received from the LLM.
 */
export interface LLMOutput {
  changes: ProposedFileChange[];
  summary: string; // A concise summary of all changes made/proposed
  thoughtProcess?: string; // LLM's detailed reasoning for the changes
}

// Frontend specific types for UI state
export interface FrontendProposedFileChange extends ProposedFileChange {
  status: "pending" | "accepted" | "rejected";
  // relativePath is no longer needed here as ProposedFileChange.filePath is now relative
}
