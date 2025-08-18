// src/types.ts

/**
 * Represents a file that has been scanned from the project,
 * including its absolute path, its path relative to the project root, and its textual content.
 */
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
  filePath: string; // Absolute path to the file to be changed
  action: 'add' | 'modify' | 'delete';
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
  scanPaths: string[];
}

/**
 * Represents the structured output received from the LLM.
 */
export interface LLMOutput {
  changes: ProposedFileChange[];
  summary: string; // A concise summary of all changes made/proposed
  thoughtProcess?: string; // LLM's detailed reasoning for the changes
}

/**
 * Represents the authentication token and associated user information
 * obtained from an OAuth flow.
 */
export interface AuthToken {
  accessToken: string;
  userId: string;
  userEmail: string;
  userName?: string; // User's display name
  userImage?: string; // URL to user's profile image
  userRole?: string; // User's role (e.g., 'ADMIN', 'USER')
  username?: string; // User's unique username, if applicable (e.g., GitHub login)
  provider: 'google' | 'github'; // The OAuth provider used
  expiresAt?: number; // Optional: JWT expiration timestamp in seconds
}
