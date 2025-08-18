import { AuthToken, ScannedFile, LLMInput, LLMOutput } from './types';

// Assuming your backend URL is configured in a .env file for the CLI
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

interface BackendErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

/**
 * Utility to make authenticated requests to the NestJS backend.
 */
export class BackendApi {
  constructor(private authToken: AuthToken | null) {}

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Create a new Headers object, which can correctly process various HeadersInit types
    const requestHeaders = new Headers(options.headers);

    // Set or overwrite the 'Content-Type' header
    requestHeaders.set('Content-Type', 'application/json');

    if (this.authToken?.accessToken) {
      // Use .set() method for type-safe addition of headers
      requestHeaders.set('Authorization', `Bearer ${this.authToken.accessToken}`);
    } else {
      console.warn(
        `Warning: No authentication token found for request to ${endpoint}. Request might fail if backend requires auth.`,
      );
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: requestHeaders, // Pass the constructed Headers object
    });

    if (!response.ok) {
      let errorData: BackendErrorResponse | { message: string };
      try {
        errorData = (await response.json()) as BackendErrorResponse; // Type assertion
      } catch (e) {
        errorData = {
          message: response.statusText || 'Unknown error parsing backend response body',
        };
      }
      const errorMessage = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message;
      throw new Error(`Backend Error (${response.status}): ${errorMessage}`);
    }

    return response;
  }

  // --- LLM Operations ---
  /**
   * Calls the LLM via the NestJS backend to generate content.
   * Assumes the backend handles LLM interaction and parsing.
   */
  public async callLLM(llmInput: LLMInput): Promise<LLMOutput> {
    // Removed redundant projectRoot parameter
    const response = await this.fetchWithAuth(
      `/api/llm/generate-llm?projectRoot=${encodeURIComponent(llmInput.projectRoot)}`,
      {
        // Use llmInput.projectRoot
        method: 'POST',
        body: JSON.stringify(llmInput),
      },
    );
    // The backend should return the already parsed LLMOutput
    return (await response.json()) as LLMOutput;
  }

  // --- File Scanning Operation (via NestJS FileService.scan endpoint) ---
  /**
   * Scans project files by calling the NestJS backend's FileService.scan endpoint.
   */
  public async scanProject(
    scanPaths: string[],
    projectRoot: string,
    verbose: boolean = false,
  ): Promise<ScannedFile[]> {
    const response = await this.fetchWithAuth('/api/file/scan', {
      method: 'POST',
      body: JSON.stringify({
        scanPaths,
        projectRoot,
        verbose,
      }),
    });
    return (await response.json()) as ScannedFile[];
  }

  // --- File Operations (Create, Write, Delete) via NestJS FileService endpoints ---
  /**
   * Creates a file or directory via the backend.
   */
  public async createFile(filePath: string, isDirectory: boolean, content?: string): Promise<any> {
    const response = await this.fetchWithAuth('/api/file/create', {
      method: 'POST',
      body: JSON.stringify({ filePath, isDirectory, content }),
    });
    return await response.json();
  }

  /**
   * Writes content to a file via the backend.
   */
  public async writeFile(filePath: string, content: string): Promise<any> {
    const response = await this.fetchWithAuth('/api/file/write', {
      method: 'POST',
      body: JSON.stringify({ filePath, content }),
    });
    return await response.json();
  }

  /**
   * Deletes a file or directory via the backend.
   */
  public async deleteFile(filePath: string): Promise<any> {
    const response = await this.fetchWithAuth('/api/file/delete', {
      method: 'POST', // Or DELETE if your backend uses RESTful DELETE verb
      body: JSON.stringify({ filePath }), // DELETE often doesn't have a body, but POST is safer for cross-origin or complex params
    });
    return await response.json();
  }

  // You might add more methods here for other backend endpoints as needed (e.g., rename, search, read file content directly)
}
