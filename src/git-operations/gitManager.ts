 // src/git-operations/gitManager.ts
import simpleGit, { SimpleGit, CheckRepoActions } from 'simple-git'; 
import * as path from 'path';

/**
 * Initializes a simple-git instance for the given directory.
 * @param baseDir The base directory of the Git repository.
 * @returns A SimpleGit instance.
 */
function getGit(baseDir: string): SimpleGit {
  return simpleGit(baseDir, { binary: 'git' });
}

/**
 * Checks if the given directory is a Git repository.
 * @param dirPath The path to check.
 * @returns True if it's a Git repo, false otherwise.
 */
export async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    const git = getGit(dirPath);
    // Correct usage: CheckRepoActions.IS_GIT_REPO checks if the path is inside any Git repo
    // or CheckRepoActions.IS_REPO_ROOT if you only want to verify it's the .git directory root.
    await git.checkIsRepo(CheckRepoActions.IS_REPO_ROOT ); // <-- CHANGE THIS LINE
    return true;
  } catch (error) {
    // This typically throws if it's not a repo.
    return false;
  }
}

/**
 * Creates a new Git branch.
 * @param repoPath The path to the Git repository.
 * @param branchName The name of the new branch to create.
 */
export async function createBranch(repoPath: string, branchName: string): Promise<void> {
  const git = getGit(repoPath);
  try {
    await git.branch([branchName]);
    await git.checkout(branchName);
    console.log(`  ✅ Git: Created and checked out new branch: ${branchName}`);
  } catch (error) {
    console.warn(`  ⚠️ Git: Could not create or checkout branch '${branchName}': ${(error as Error).message}`);
    // If branch already exists, it might just checkout. If it's a fatal error, rethrow.
    if ((error as Error).message.includes('A branch named') && (error as Error).message.includes('already exists')) {
        console.warn(`  ⚠️ Git: Branch '${branchName}' already exists. Checking it out instead.`);
        await git.checkout(branchName);
    } else {
        throw error; // Re-throw unhandled errors
    }
  }
}

/**
 * Stages (adds) specified files to the Git index.
 * @param repoPath The path to the Git repository.
 * @param filePaths An array of file paths (relative to repoPath) to stage.
 */
export async function stageFiles(repoPath: string, filePaths: string[]): Promise<void> {
  const git = getGit(repoPath);
  try {
    // Convert absolute paths to paths relative to the repo root for git add
    const relativePaths = filePaths.map(filePath => path.relative(repoPath, filePath));
    await git.add(relativePaths);
    console.log(`  ✅ Git: Staged ${filePaths.length} files.`);
  } catch (error) {
    console.error(`  ❌ Git: Failed to stage files: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Gets the current branch name.
 * @param repoPath The path to the Git repository.
 * @returns The name of the current branch, or null if not in a branch.
 */
export async function getCurrentBranch(repoPath: string): Promise<string | null> {
    const git = getGit(repoPath);
    try {
        const branchSummary = await git.branchLocal();
        return branchSummary.current;
    } catch (error) {
        // Not a git repo, or other error
        return null;
    }
}
