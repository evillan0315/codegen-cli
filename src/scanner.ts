// src/llm/llmOrchestrator.ts (or wherever this client-side scanProject is located)
// Assuming this file runs in a Node.js environment where `process.env` is available,
// and `axios` is installed.

import axios from 'axios'; // Import axios for making HTTP requests
import { ScannedFile } from './types'; // Keep this import, as it's the expected return type

// Your NestJS API Base URL
const NESTJS_API_BASE_URL = process.env.NESTJS_API_BASE_URL;

if (!NESTJS_API_BASE_URL) {
  console.error('Error: NESTJS_API_BASE_URL environment variable not set.');
  console.error('Please ensure it is set (e.g., in your .env file) to your NestJS backend URL (e.g., "http://localhost:3000").');
  process.exit(1); // Or throw an error, depending on your application's error handling strategy
}

/**
 * Scans specified paths (which can be directories or individual files) recursively for relevant code files
 * by calling the NestJS backend API.
 *
 * @param scanPaths An array of paths (relative or absolute) to scan. Each path can be a directory or a file.
 * @param projectRoot The root directory of the project, used for calculating relative paths on the backend.
 * @param verbose If true, requests verbose logging from the backend during scanning.
 * @returns A promise that resolves to an array of ScannedFile objects.
 */
export async function scanProject(
  scanPaths: string[],
  projectRoot: string,
  verbose: boolean = false
): Promise<ScannedFile[]> {
  try {
    const response = await axios.post<ScannedFile[]>(
      `${NESTJS_API_BASE_URL}/api/file/scan`, // Adjust this endpoint to match your NestJS API
      {
        scanPaths,
        projectRoot,
        verbose,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Add any necessary authorization headers here if your NestJS API is protected
          // 'Authorization': `Bearer YOUR_AUTH_TOKEN`,
        },
      }
    );

    // Axios automatically parses JSON responses, so response.data will be your ScannedFile[]
    console.log(`Successfully retrieved ${response.data.length} scanned files from NestJS API.`);
    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      console.error(
        `Error calling NestJS API for file scanning (Status: ${status || 'N/A'}): ${errorMessage}`
      );
      throw new Error(`Failed to scan project via API: ${errorMessage}`);
    } else {
      console.error(`An unexpected error occurred during API call for scanning: ${(error as Error).message}`);
      throw new Error(`An unexpected error occurred: ${(error as Error).message}`);
    }
  }
}
