// src/file-operations/fileApplier.ts
import { promises as fs } from 'fs';
import * as path from 'path';
import { ProposedFileChange } from '../types';

/**
 * Applies a single proposed file change (add, modify, or delete) to the file system.
 * Ensures parent directories exist for 'add' actions.
 * @param projectRoot The absolute path to the root of the target project.
 * @param change The ProposedFileChange object.
 * @returns A Promise that resolves when the operation is complete.
 */
export async function applyFileChange(projectRoot: string, change: ProposedFileChange): Promise<void> {
  // Resolve the absolute path using the provided projectRoot
  const absolutePath = path.resolve(projectRoot, change.filePath);

  switch (change.action) {
    case 'add':
      // Ensure the directory exists before writing the file
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
      if (change.newContent === undefined) {
        throw new Error(`Cannot add file '${change.filePath}': newContent is undefined.`);
      }
      await fs.writeFile(absolutePath, change.newContent, 'utf-8');
      console.log(`  ➕ Created: ${path.relative(projectRoot, absolutePath)}`); // Log path relative to project
      break;

    case 'modify':
      // Check if the file exists before attempting to modify
      try {
        await fs.access(absolutePath); // Throws if file doesn't exist
      } catch {
        throw new Error(`Cannot modify file '${change.filePath}': File does not exist in target project.`);
      }
      if (change.newContent === undefined) {
        throw new Error(`Cannot modify file '${change.filePath}': newContent is undefined.`);
      }
      await fs.writeFile(absolutePath, change.newContent, 'utf-8');
      console.log(`  ✏️ Modified: ${path.relative(projectRoot, absolutePath)}`); // Log path relative to project
      break;

    case 'delete':
      // Check if the file exists before attempting to delete
      try {
        await fs.access(absolutePath);
      } catch {
        throw new Error(`Cannot delete file '${change.filePath}': File does not exist in target project.`);
      }
      await fs.unlink(absolutePath);
      console.log(`  🗑️ Deleted: ${path.relative(projectRoot, absolutePath)}`); // Log path relative to project
      // Optional: Recursively delete empty parent directories
      await cleanupEmptyParentDirectories(projectRoot, absolutePath); // Pass projectRoot here
      break;

    default:
      throw new Error(`Unknown action type: ${(change as any).action}`);
  }
}

/**
 * Attempts to delete empty parent directories after a file is deleted.
 * Stops at the first non-empty or non-existent directory.
 * @param projectRoot The absolute path to the root of the target project.
 * @param filePath The path of the file that was deleted (absolute path).
 */
async function cleanupEmptyParentDirectories(projectRoot: string, filePath: string): Promise<void> {
  let currentDir = path.dirname(filePath); // This filePath is already absolute
  // const projectRoot = process.cwd(); // This line is now removed or changed

  // Walk up the directory tree
  // Stop when currentDir reaches the projectRoot or the system root
  while (currentDir !== projectRoot && currentDir !== path.parse(currentDir).root) {
    try {
      const entries = await fs.readdir(currentDir);
      if (entries.length === 0) {
        // Directory is empty, delete it
        await fs.rmdir(currentDir);
        console.log(`  🧹 Cleaned up empty directory: ${path.relative(projectRoot, currentDir)}`);
        currentDir = path.dirname(currentDir); // Move up to parent
      } else {
        // Directory is not empty, stop
        break;
      }
    } catch (error) {
      // If directory doesn't exist or other error, stop
      break;
    }
  }
}
