# AI Editor CLI Usage Guide

This guide provides detailed instructions and examples for using the AI Editor Command Line Interface (CLI). The `aicli` tool allows developers to interact with the AI Editor backend service to perform AI-powered code generation, file scanning, and apply changes, along with local Git operations.

## Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Authentication Commands](#authentication-commands)
  - [`aicli login <provider>`](#aicli-login-provider)
  - [`aicli logout`](#aicli-logout)
  - [`aicli whoami`](#aicli-whoami)
- [Project Interaction Commands](#project-interaction-commands)
  - [`aicli scan [paths...]`](#aicli-scan-paths)
  - [`aicli generate <prompt>`](#aicli-generate-prompt)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Introduction

The `aicli` is your primary interface for leveraging the AI Editor's capabilities from the terminal. It orchestrates communication with a separate backend service for compute-intensive and sensitive operations (like LLM calls and file system modifications), while handling local tasks such as Git integration and user interaction for reviewing proposed changes.

## Prerequisites

Before using the CLI, ensure you have:

- Node.js (LTS version recommended)
- npm or yarn
- Git (for projects requiring Git integration)
- **The AI Editor Backend service running and accessible.** Refer to the main [README.md](../README.md) for instructions on starting the backend. The CLI _cannot_ function without a running backend.
- Your backend configured with a valid LLM API key (e.g., Google Gemini). See [Google Gemini API Key Setup](google-gemini-setup.md) for details.

## Configuration

The CLI relies on an environment variable, `BACKEND_URL`, to know where to find the AI Editor backend service. It is recommended to set this in a `.env` file in the root of your CLI project (or the directory from where you run `aicli`).

**Example `.env` file (at the CLI project root):**

```env
BACKEND_URL=http://localhost:5000
```

Replace `http://localhost:5000` with the actual URL of your running backend service if it's different.

## Authentication Commands

The AI Editor CLI uses OAuth 2.0 for authentication. You must log in before you can use commands like `scan` or `generate`.

### `aicli login <provider>`

Initiates the OAuth login flow to authenticate the CLI with the backend service. This command will open a browser window for you to complete the authentication process.

**Usage:**

```bash
aicli login <provider> [options]
```

**Arguments:**

- `<provider>`: The OAuth provider to use for authentication. Currently supported: `google` | `github`.

**Options:**

- `-p, --port <port>`: Specify the local port for the CLI to listen on for the OAuth callback. Defaults to `8080`. Useful if the default port is already in use.

**How it works:**

1.  The CLI starts a temporary local web server on the specified port.
2.  It opens your default web browser to the backend's OAuth initiation URL, including the CLI's callback port.
3.  You will be prompted to log in and grant access via your chosen provider (Google/GitHub).
4.  Upon successful authentication, the backend redirects back to the CLI's local server with an access token.
5.  The CLI captures and securely stores this token in your user's home directory (`~/.ai-editor-config.json`). All subsequent requests to the backend will use this token for authorization.

**Examples:**

```bash
# Log in using your Google account
aicli login google

# Log in using your GitHub account, listening on port 8081 if 8080 is busy
aicli login github --port 8081

# Attempt login with an invalid provider (will show an error)
aicli login facebook
```

### `aicli logout`

Clears the stored OAuth authentication token, effectively logging you out from the CLI. This removes your local session data.

**Usage:**

```bash
aicli logout
```

**Examples:**

```bash
# Log out the current user
aicli logout

# Try logging out when not logged in (will show a message but no error)
aicli logout
```

### `aicli whoami`

Displays information about the currently authenticated user, if a token is stored. This is useful for verifying your login status and user details.

**Usage:**

```bash
aicli whoami
```

**Examples:**

```bash
aicli whoami

# Expected output if logged in:
# Currently authenticated user:
#   Email: your.email@example.com
#   Name: Your Name
#   Provider: google
#   User ID: <user-id>
#   Access Token (first 10 chars): <token-snippet>...

# Expected output if not logged in:
# Not currently logged in. Use `aicli login <provider>` to log in.
```

## Project Interaction Commands

These commands interact with your local project files and the AI Editor backend to perform scanning and code generation.

### `aicli scan [paths...]`

Scans one or more specified files or directories within your project. The actual file system traversal and content reading are delegated to the backend service, which then returns the relevant file data.

**Usage:**

```bash
aicli scan [paths...] [options]
```

**Arguments:**

- `[paths...]`: Optional. A space-separated list of file paths or directory paths to scan, relative to the current working directory. If omitted, the entire current directory (`.`) is scanned.

**Options:**

- `-v, --verbose`: Output detailed information during the scan, including each file being processed by the backend.
- `-s, --show-content`: For the first few sample files found, show a snippet of their content directly in the console output.

**How it works:**

1.  The CLI sends the specified `scanPaths` (absolute paths) and `projectRoot` (absolute path of current working directory) to the backend's `/api/file/scan` endpoint.
2.  The backend performs the recursive file traversal and reads content, respecting `.gitignore` files.
3.  The backend returns a list of `ScannedFile` objects, which the CLI then processes and displays a summary of.

**Examples:**

```bash
# Scan all files in the current directory and its subdirectories
aicli scan

# Scan the 'src' directory and the 'tests/unit' directory
aicli scan src tests/unit

# Scan a single file ('src/index.ts') and show its content snippet
aicli scan src/index.ts --show-content

# Scan the entire project verbosely, showing which files are processed
aicli scan . --verbose

# Scan multiple specific files
aicli scan src/utils/helpers.ts src/components/Button.tsx --show-content
```

### `aicli generate <prompt>`

This is the core command for AI-powered code generation or modification. It takes a natural language prompt, sends it to the backend's LLM, and allows you to review and apply the proposed changes interactively.

**Usage:**

```bash
aicli generate <prompt> [options]
```

**Arguments:**

- `<prompt>`: Your natural language instruction for the AI (e.g., "Refactor this component," "Add a new feature"). This should be enclosed in quotes if it contains spaces to be treated as a single argument.

**Options:**

- `-p, --path <path>`: Specify the project root directory. All file paths for scanning and Git operations will be relative to this path. Defaults to the current working directory (`.`).
- `--scan-dirs <dirs...>`: Space-separated list of directories to scan within the project root. If neither `--scan-dirs` nor `--scan-files` is provided, the entire project root (`.`) will be scanned by default. (e.g., `--scan-dirs 'src tests'`) `Note: Quote arguments with spaces.`
- `--scan-files <files...>`: Space-separated list of individual file paths to scan within the project root. (e.g., `--scan-files 'src/App.tsx tests/my-test.ts'`) `Note: Quote arguments with spaces.`
- `-y, --yes`: **Automatically confirm all proposed changes without prompting.** Use with extreme caution, as this will apply all changes suggested by the AI without manual review. Defaults to `false`.
- `--no-git`: Skip all Git operations (creating a new branch, staging files). Defaults to `false`. This means changes will be applied directly to your current branch.
- `--branch <name>`: Specify a custom branch name to create and checkout before applying changes. If not provided and Git operations are enabled, a default name will be suggested based on the prompt (e.g., `feature/your-prompt-slug`).

**How it works:**

1.  **Git Pre-check (if not `--no-git`):**
    - Checks if the specified project root is a Git repository.
    - If so, it prompts you to confirm Git operations (creating a new branch). If confirmed, it will create and checkout a new branch (either custom or AI-suggested).
2.  **Project Scanning:**
    - The CLI delegates to the backend to gather content from the specified `scan-dirs` or `scan-files` (or the entire project root).
3.  **LLM Call:**
    - Prepares an `LLMInput` object containing your prompt, scanned file content, and project structure information.
    - Sends this `LLMInput` to the backend's `/api/llm/generate-llm` endpoint.
    - The backend processes the request with its configured LLM (e.g., Google Gemini) and returns `LLMOutput`, which includes a `summary`, `thoughtProcess`, and a list of `ProposedFileChange` objects.
4.  **Review Proposed Changes:**
    - The CLI iterates through each `ProposedFileChange` from the LLM.
    - For `add` actions, it shows a preview of the new file's content.
    - For `modify` actions, it generates and displays a colored unified diff between the original and proposed content.
    - For `delete` actions, it indicates the file to be removed.
    - For each change, unless `--yes` is used, you will be prompted to `Yes`, `No`, `Apply All`, or `Abort`.
5.  **Apply Confirmed Changes:**
    - For each confirmed change, the CLI calls the backend's file service endpoints (`/api/file/create`, `/api/file/write`, or `/api/file/delete`).
    - The backend then performs the actual file system operations.
6.  **Git Post-operations (if not `--no-git`):**
    - After applying changes, the CLI stages all modified/added/deleted files in the current Git branch.
    - It then provides clear instructions for reviewing, committing, and testing your changes.

**Examples:**

```bash
# Implement a new feature, scanning only the 'src/auth' directory for context
aicli generate "Implement user authentication using JWT in the 'auth' module. Create new files if necessary, following NestJS best practices." --scan-dirs src/auth

# Refactor an existing component, specifying a custom project root and branch
aicli generate "Refactor the 'Dashboard' component in 'frontend/src/components/Dashboard.tsx' to use a new state management pattern (e.g., nanostores)." --path ./apps/ai-editor-front --scan-files apps/ai-editor-front/src/components/Dashboard.tsx --branch refactor/dashboard-nanostores

# Automatically fix all linting errors in the 'utils' directory (use with extreme caution)
aicli generate "Fix all linting issues in the 'utils' folder according to the project's eslint rules, ensuring all files conform to prettier standards." --scan-dirs src/utils --yes

# Create a new service based on an existing interface, skipping Git operations
aicli generate "Create a new 'UserService' in 'src/services/' that implements the 'IUserRepo' interface from 'src/types.ts', including basic CRUD methods." --scan-files src/types.ts --no-git

# Add documentation comments to all public functions in a specific file
aicli generate "Add JSDoc-style documentation comments to all exported functions and classes in 'src/api/userApi.ts'." --scan-files src/api/userApi.ts

# Perform a bulk refactor across multiple files, confirming interactively
aicli generate "Rename all instances of 'IUser' interface to 'UserInterface' in 'src/models/' and 'src/services/', updating imports as needed." --scan-dirs 'src/models src/services'
```

## Environment Variables

- `BACKEND_URL`: **(Required)** The base URL of your AI Editor backend service. Default: `http://localhost:5000`. Ensure this is correctly set in your `.env` file.

## Troubleshooting

- **`Error: You are not logged in.`**: This means no authentication token is found. Run `aicli login <provider>` to authenticate.
- **`Backend Error (401): Unauthorized`**: Your authentication token might be expired or invalid. Try `aicli logout` followed by `aicli login <provider>` to refresh your token.
- **`Error: Port 8080 is already in use.`**: When logging in, use the `--port` option to specify an alternative local port, e.g., `aicli login google --port 8081`.
- **`Backend Error (500): ...` or connection issues**: Ensure your AI Editor backend service is running and accessible at the `BACKEND_URL` configured in your `.env` file. Check the backend's logs for more specific error messages.
- **No changes proposed by LLM**: The prompt might not be clear enough, or the LLM might determine no changes are necessary given the context. Try refining your prompt, providing more specific instructions, or increasing the scanned context with `--scan-dirs` or `--scan-files`. Also, check backend logs for LLM response details.
- **Files not found during scan**: Verify that the `--path`, `--scan-dirs`, and `--scan-files` options correctly point to existing files/directories relative to your project root. Remember to quote paths containing spaces.

For deeper architectural understanding or to contribute, please refer to the [Developer Guide](developer-guide.md).
