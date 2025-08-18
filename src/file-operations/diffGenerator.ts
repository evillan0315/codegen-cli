 // src/file-operations/diffGenerator.ts
import * as Diff from 'diff';
import chalk from 'chalk'; // For colorful console output (install if you don't have it: npm i chalk)

// Ensure chalk is installed: npm install chalk@4.1.2 (or latest version)
// Note: chalk v5+ is ESM only, so using v4 for CommonJS compatibility with ts-node without extra config.
// If you want to use chalk v5+, you might need to adjust tsconfig.json to "module": "ESNext" and add "type": "module" to package.json.

/**
 * Generates a human-readable diff string between two text contents.
 * @param originalContent The original content of the file.
 * @param newContent The proposed new content of the file.
 * @returns A string representing the unified diff, or an empty string if contents are identical.
 */
export function generateUnifiedDiff(originalContent: string, newContent: string): string {
  // Use Diff.createPatch for a standard unified diff format
  // For simpler line-by-line diffs without patch headers, Diff.diffLines is also an option.
  const diff = Diff.diffLines(originalContent, newContent);

  if (diff.length === 1 && diff[0].added === undefined && diff[0].removed === undefined) {
    return ''; // No changes
  }

  let diffString = '';
  diff.forEach(part => {
    // green for additions, red for deletions, white for common parts
    const color = part.added ? chalk.green :
                  part.removed ? chalk.red :
                  chalk.grey; // Changed to grey for context lines
    const prefix = part.added ? '+ ' :
                   part.removed ? '- ' :
                   '  '; // Indent common lines
    // Add prefix to each line
    diffString += color(part.value.split('\n').map(line => prefix + line).join('\n'));
  });

  return diffString;
}
