#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 
import { Command } from 'commander';
import inquirer from 'inquirer';
import { INSTRUCTION, ADDITIONAL_INSTRUCTION_EXPECTED_OUTPUT } from './constants';

import { generateUnifiedDiff } from './file-operations/diffGenerator';
import { applyFileChange } from './file-operations/fileApplier';
import {
  isGitRepository,
  createBranch,
  stageFiles,
  getCurrentBranch,
} from './git-operations/gitManager';
import { ScannedFile, LLMInput, LLMOutput, ProposedFileChange, AuthToken } from './types';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import {
  startOAuthWebServer,
  openAuthUrl,
  storeAuthToken,
  getAuthToken,
  clearAuthToken,
} from './auth/authManager';
import { BackendApi } from './backend-api'; 

const program = new Command();

program
  .name('aicli')
  .description('An AI-powered tool for editing and updating code files.')
  .version('0.1.1');


async function getAuthenticatedBackendApi(): Promise<BackendApi> {
  const authToken = await getAuthToken();
  if (!authToken) {
    console.error('Error: You are not logged in. Please run `aicli login <provider>` first.');
    process.exit(1);
  }
  return new BackendApi(authToken);
}

program
  .command('scan [paths...]')
  .description(
    'Scans one or more files or directories for relevant code files and reads their content via the backend service.',
  )
  .option('-v, --verbose', 'Output detailed information during scan.')
  .option('-s, --show-content', 'Show a snippet of file content for sample files.')
  .action(async (paths: string[], options: { verbose?: boolean; showContent?: boolean }) => {
    const targetPaths = paths.length > 0 ? paths : ['.'];
    const projectRoot = process.cwd(); 

    console.log(
      `Scanning paths: ${targetPaths.map((p) => path.resolve(projectRoot, p)).join(', ')}`,
    );
    if (options.verbose) {
      console.log('Verbose mode enabled.');
    }

    try {
      const backendApi = await getAuthenticatedBackendApi(); 
      const scannedFiles: ScannedFile[] = await backendApi.scanProject(
        targetPaths,
        projectRoot,
        options.verbose,
      );
      console.log('\n--- Scan Complete ---');
      console.log(`Found ${scannedFiles.length} files.`);

      if (scannedFiles.length > 0) {
        console.log('Sample files found:');
        scannedFiles.slice(0, 5).forEach((file) => {
          const displayPath = path.relative(process.cwd(), file.filePath); 
          console.log(`  - ${displayPath}`);
          if (options.showContent) {
            const contentSnippet =
              file.content.substring(0, 200) + (file.content.length > 200 ? '...' : '');
            console.log(
              `    Content snippet:\n${contentSnippet
                .split('\n')
                .map((line) => `      ${line}`)
                .join('\n')}\n`,
            );
          }
        });
        if (scannedFiles.length > 5) {
          console.log(`  ... and ${scannedFiles.length - 5} more.`);
        }
      }
    } catch (error) {
      console.error(`Error during scan: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('generate <prompt>')
  .description(
    'Generates or modifies code based on a natural language prompt via the backend LLM service.',
  )
  .option(
    '-p, --path <path>',
    'Specify the project root directory (default: current directory). This is where Git operations and file resolution will be based.',
    '.',
  )
  .option(
    '--scan-dirs <dirs...>',
    'Space-separated list of directories to scan within the project root (e.g., \'src tests\').', 
  )
  .option(
    '--scan-files <files...>',
    'Space-separated list of individual file paths to scan within the project root (e.g., \'src/App.tsx tests/my-test.ts\').', 
  )
  .option(
    '-y, --yes',
    'Automatically confirm all proposed changes without prompting (USE WITH CAUTION!).',
    false,
  )
  .option('--no-git', 'Skip all Git operations (branching, staging).', false)
  .option(
    '--branch <name>',
    'Specify a branch name to create/checkout. If not provided, a default is suggested.',
  )
  .action(
    async (
      prompt: string,
      options: {
        path: string; 
        scanDirs?: string[];
        scanFiles?: string[];
        yes: boolean;
        noGit: boolean;
        branch?: string;
      },
    ) => {
      const projectRoot = path.resolve(process.cwd(), options.path);

      let allScanPaths: string[] = [];
      if (options.scanDirs && options.scanDirs.length > 0) {
        allScanPaths = allScanPaths.concat(options.scanDirs);
      }
      if (options.scanFiles && options.scanFiles.length > 0) {
        allScanPaths = allScanPaths.concat(options.scanFiles);
      }
      if (allScanPaths.length === 0) {
        allScanPaths = ['.']; 
      }

      const autoConfirm = options.yes;
      const skipGit = options.noGit;
      const customBranchName = options.branch;

      console.log(`AI Code Generation Request: '${prompt}'`);
      console.log(`Project root: ${projectRoot}`);
      console.log(`Scanning paths (relative to project root): ${allScanPaths.join(', ')}`);

      try {
        const backendApi = await getAuthenticatedBackendApi(); 

        let isGitRepo = false;
        let originalBranch: string | null = null;
        if (!skipGit) {
          isGitRepo = await isGitRepository(projectRoot);
          if (isGitRepo) {
            originalBranch = await getCurrentBranch(projectRoot);
            console.log(
              `\n--- Git: Detected Git repository. Current branch: ${originalBranch} ---`,
            );
            if (!autoConfirm) {
              const defaultBranchSuggestion =
                `feature/${prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.substring(0, 50);
              const { proceedGit } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'proceedGit',
                  message: `Proceed with Git operations (create new branch, stage changes)? Recommended.`,
                  default: true,
                },
              ]);
              if (!proceedGit) {
                options.noGit = true;
              } else {
                if (!customBranchName) {
                  const { branchNameInput } = await inquirer.prompt([
                    {
                      type: 'input',
                      name: 'branchNameInput',
                      message: `Enter new branch name (default: ${defaultBranchSuggestion}):`,
                      default: defaultBranchSuggestion,
                    },
                  ]);
                  options.branch = branchNameInput;
                }
                await createBranch(projectRoot, options.branch!);
              }
            } else {
              
              if (!options.noGit && !customBranchName) {
                options.branch =
                  `feature/${prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.substring(0, 50);
                console.log(`Auto-creating branch: ${options.branch}`);
              }
              if (!options.noGit && options.branch) {
                await createBranch(projectRoot, options.branch);
              }
            }
          } else {
            console.log(`\n--- Git: Not a Git repository. Skipping Git operations. ---`);
            options.noGit = true;
          }
        } else {
          console.log(`\n--- Git: Skipping Git operations as requested. ---`);
        }

        console.log('\n--- Step 1: Scanning project files ---');
        
        const scannedFiles: ScannedFile[] = await backendApi.scanProject(allScanPaths, projectRoot);
        console.log(`Found ${scannedFiles.length} files.`);

        const originalFileContents = new Map<string, string>();
        scannedFiles.forEach((file) =>  { 
          originalFileContents.set(file.filePath, file.content); 
          console.log(`\n Scan file: ${file.filePath} ... done.`);
        }); 

        console.log('\n--- Step 2: Preparing LLM context ---');
        console.log(`Project structure generate: ${projectRoot}`);
        const projectStructure = ''; 

        const llmInput: LLMInput = {
          userPrompt: prompt,
          projectRoot: projectRoot,
          projectStructure: projectStructure || '',
          relevantFiles: scannedFiles, 
          scanPaths: allScanPaths,
          additionalInstructions: `${INSTRUCTION}`.replace(/^\s+/gm, ''),
          expectedOutputFormat: `${ADDITIONAL_INSTRUCTION_EXPECTED_OUTPUT}`.replace(/^\s+/gm, ''),
        };

        console.log('\n--- Step 3: Calling LLM ---');
        console.log('\n--- Please wait, this may take a while... ---');
        const llmOutput: LLMOutput = await backendApi.callLLM(llmInput);
        
        console.log('\n--- Step 4: LLM Proposed Changes ---');
        console.log(`Summary: ${llmOutput.summary}`);
        if (llmOutput.thoughtProcess) {
          console.log(`Thought Process:\n${llmOutput.thoughtProcess}`);
        }

        if (llmOutput.changes.length === 0) {
          console.log('No changes proposed by the LLM. Exiting.');
          return;
        }

        console.log('\nReviewing Proposed File Changes:');
        const changesToApply: ProposedFileChange[] = [];
        const filesModifiedOrAdded: string[] = [];

        for (const change of llmOutput.changes) {
          const relativePathForDisplay = path.relative(projectRoot, change.filePath);
          console.log(
            `\n--- Proposed Change for: ${relativePathForDisplay} (${change.action.toUpperCase()}) ---`,
          );
          if (change.reason) {
            console.log(`Reason: ${change.reason}`);
          }

          if (change.action === 'add') {
            console.log('This will create a NEW file.');
            console.log('New Content Preview (first 20 lines):');
            console.log('```typescript');
            console.log(change.newContent?.split('\n').slice(0, 20).join('\n'));
            if (change.newContent && change.newContent.split('\n').length > 20) {
              console.log('...');
            }
            console.log('```');
          } else if (change.action === 'modify') {
            
            const originalContent = originalFileContents.get(change.filePath) || '';
            const diff = generateUnifiedDiff(originalContent, change.newContent || '');
            if (diff) {
              console.log('Changes (diff):');
              console.log(diff);
            } else {
              console.log(
                'No effective changes detected (content is identical). Skipping this modification.',
              );
              continue;
            }
          } else if (change.action === 'delete') {
            console.log('This will DELETE the file.');
          }

          if (autoConfirm) {
            console.log('Auto-confirming this change (--yes flag).');
            changesToApply.push(change);
            filesModifiedOrAdded.push(change.filePath);
          } else {
            const { confirm } = await inquirer.prompt([
              {
                type: 'list',
                name: 'confirm',
                message: `Apply this change to ${relativePathForDisplay}? (type yes, no, all, abort) or `,
                choices: [
                  { name: 'Yes (apply this change)', value: 'yes' },
                  { name: 'No (skip this change)', value: 'no' },
                  { name: 'Apply All (apply this and all subsequent changes)', value: 'all' },
                  { name: 'Abort (stop entirely)', value: 'abort' },
                ],
              },
            ]);

            if (confirm === 'yes') {
              changesToApply.push(change);
              filesModifiedOrAdded.push(change.filePath);
            } else if (confirm === 'all') {
              changesToApply.push(change);
              filesModifiedOrAdded.push(change.filePath);
              options.yes = true; 
            } else if (confirm === 'abort') {
              console.log('Aborting changes. No files modified.');
              if (isGitRepo && !options.noGit && options.branch && originalBranch) {
                console.log(`Reverting to original branch: ${originalBranch}`);
                await getGit(projectRoot).checkout(originalBranch);
              }
              return;
            } else {
              console.log(`Skipping change for ${relativePathForDisplay}.`);
            }
          }
        }

        if (changesToApply.length === 0) {
          console.log('\nNo changes were confirmed. Exiting.');
          if (isGitRepo && !options.noGit && options.branch && originalBranch) {
            console.log(`Reverting to original branch: ${originalBranch}`);
            await getGit(projectRoot).checkout(originalBranch);
          }
          return;
        }

        console.log('\n--- Applying Confirmed Changes ---');
        for (const change of changesToApply) {
          try {
            
            await applyFileChange(backendApi, projectRoot, change);
          } catch (fileError) {
            console.error(
              `Failed to apply change for ${change.filePath}: ${(fileError as Error).message}`,
            );
          }
        }

        console.log('\n--- Changes Applied Successfully! ---');

        if (isGitRepo && !options.noGit) {
          console.log('\n--- Git: Staging changes ---');
          await stageFiles(projectRoot, filesModifiedOrAdded);

          console.log('\nNext Steps:');
          console.log(
            `1. Your changes have been applied and staged on branch '${options.branch || originalBranch}'.`,
          );
          console.log(`2. Review the changes using 'git diff --staged'.`);
          console.log(`3. Commit your changes:`);
          console.log(`   git commit -m '${llmOutput.summary}'`);
          console.log(`4. Run your tests to ensure everything still works as expected.`);
          console.log(
            `5. If you want to revert to the previous branch: git checkout ${originalBranch}`,
          );
        } else {
          console.log('\nNext Steps:');
          console.log(`1. It\'s highly recommended to review the changes in your editor.`); 
          if (isGitRepo) {
            console.log(`2. You skipped Git operations. To commit, you\'ll need to manually:`); 
            console.log(`   git add .`);
            console.log(`   git commit -m '${llmOutput.summary}'`);
          } else {
            console.log(
              `2. This is not a Git repository. Consider initializing one if this is a project:`,
            );
            console.log(`   git init`);
            console.log(`   git add .`);
            console.log(`   git commit -m 'Initial commit by AI Editor'`);
          }
          console.log(`3. Run your tests to ensure everything still works as expected.`);
        }
      } catch (error) {
        console.error(`Error during generation: ${(error as Error).message}`);
        process.exit(1);
      }
    },
  );

program
  .command('login <provider>')
  .description('Authenticates the CLI with the backend using OAuth (Google/GitHub).')
  .option(
    '-p, --port <port>',
    'Specify the local port for the CLI to listen on for the OAuth callback.',
    '8080',
  )
  .action(async (provider: 'google' | 'github', options: { port: string }) => {
    if (!['google', 'github'].includes(provider)) {
      console.error('Invalid provider. Supported providers are \'google\' and \'github\'.'); 
      process.exit(1);
    }

    const cliPort = parseInt(options.port, 10);
    if (isNaN(cliPort) || cliPort < 1024 || cliPort > 65535) {
      console.error('Invalid port. Please specify a port between 1024 and 65535.');
      process.exit(1);
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const authUrl = `${backendUrl}/api/auth/${provider}`;

    console.log(`Initiating ${provider} OAuth login...`);
    console.log(`CLI will listen on http://localhost:${cliPort} for the callback.`);
    console.log(`Opening browser to: ${authUrl}?cli_port=${cliPort}`);

    try {
      const authPromise = startOAuthWebServer(cliPort);
      await openAuthUrl(authUrl, cliPort);
      const authToken: AuthToken = await authPromise;
      await storeAuthToken(authToken);
      console.log(
        `\nSuccessfully logged in as ${authToken.userEmail} (${authToken.userName || 'N/A'}) via ${authToken.provider}.`,
      );
    } catch (error) {
      console.error(`\nOAuth login failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Clears the stored OAuth authentication token.')
  .action(async () => {
    try {
      await clearAuthToken();
      console.log('Successfully logged out. Authentication token cleared.');
    } catch (error) {
      console.error(`Logout failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('whoami')
  .description('Displays the currently authenticated user information.')
  .action(async () => {
    try {
      const authToken = await getAuthToken();
      if (authToken) {
        console.log('Currently authenticated user:');
        console.log(`  Email: ${authToken.userEmail}`);
        console.log(`  Name: ${authToken.userName || 'N/A'}`);
        console.log(`  Provider: ${authToken.provider}`);
        console.log(`  User ID: ${authToken.userId}`);
        if (authToken.userRole) {
          console.log(`  Role: ${authToken.userRole}`);
        }
        if (authToken.username) {
          console.log(`  Username: ${authToken.username}`);
        }
        console.log(
          `  Access Token (first 10 chars): ${authToken.accessToken.substring(0, 10)}...`,
        );
      } else {
        console.log('Not currently logged in. Use `ai-editor login <provider>`` to log in.'); 
      }
    } catch (error) {
      console.error(`Error retrieving user info: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

function getGit(baseDir: string): SimpleGit {
  return simpleGit(baseDir, { binary: 'git' });
}
