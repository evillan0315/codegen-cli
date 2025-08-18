// src/file-operations/fileApplier.ts
import * as path from 'path';
import { ProposedFileChange } from '../types';
import { BackendApi } from '../backend-api'; // Import the BackendApi

/**
 * Applies a single file change (add, modify, delete) by calling the backend API.
 * @param backendApi An instantiated BackendApi client.
 * @param projectRoot The project root directory.
 * @param change The ProposedFileChange object.
 */
export async function applyFileChange(
  backendApi: BackendApi, // Now takes BackendApi instance
  projectRoot: string, // Still useful for path resolution relative to root
  change: ProposedFileChange,
): Promise<void> {
  // Path resolution for backend: Ensure it's an absolute path to be clear.
  // The backend's FileService will also resolve it against its BASE_DIR.
  const absoluteFilePath = path.resolve(projectRoot, change.filePath);

  switch (change.action) {
    case 'add':
      console.log(`Creating new file: ${change.filePath}`);
      await backendApi.createFile(absoluteFilePath, false, change.newContent || '');
      break;
    case 'modify':
      console.log(`Modifying file: ${change.filePath}`);
      await backendApi.writeFile(absoluteFilePath, change.newContent || '');
      break;
    case 'delete':
      console.log(`Deleting file: ${change.filePath}`);
      await backendApi.deleteFile(absoluteFilePath);
      break;
    default:
      console.warn(`Unknown action type for change: ${change.action}. Skipping.`);
  }
}
