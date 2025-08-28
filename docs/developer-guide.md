# Developer Guide

This guide provides an in-depth overview of the AI Editor project's architecture, core concepts, and module responsibilities, aimed at developers looking to understand and contribute to the CLI tool. It focuses on the CLI's role as a client interacting with a separate backend service for AI processing and file system operations.

## Project Overview

The AI Editor CLI (`aicli`) is a command-line client that orchestrates AI-powered code editing tasks. It operates on a client-server model: the CLI handles local interactions, Git operations, and presenting changes, while delegating all resource-intensive and sensitive operations (like direct file system modifications and LLM calls) to a trusted, separately running backend service. This architecture ensures the CLI remains lightweight and focused on user experience, while the backend manages complex logic and privileged access.

## Getting Started

For basic setup, installation, and usage instructions for both the CLI tool and the frontend application, please refer to the main [README.md](../README.md) in the project root.

### Prerequisites (Specific to CLI Development)

- Node.js (version >= 18)
- npm or yarn
- Git (for local Git operations)
- **AI Editor Backend service running and accessible.** The CLI communicates with this service for all AI and file system operations. Instructions for setting up the backend can be found in its respective repository (e.g., `project-board-server`).
- `BACKEND_URL` environment variable set in the CLI's environment (e.g., in its `.env` file) to the URL of your running backend service (e.g., `http://localhost:5000`).
- A Google Gemini API key (or other LLM provider keys) configured on your **backend service**. Refer to the backend's documentation for details, and [Setting up Google Gemini API Key](google-gemini-setup.md) for general information on obtaining the key.

## Project Structure (CLI Tool Focus)

```
ai-editor/
├── src/                  # AI Editor CLI Source Code
│   ├── auth/             # OAuth handling, token storage (authManager.ts)
│   ├── backend-api/      # Client for interacting with the NestJS backend (backend-api.ts)
│   ├── file-operations/  # Local diff generation, delegates file changes to backend (diffGenerator.ts, fileApplier.ts)
│   ├── git-operations/   # Local Git repository management (gitManager.ts)
│   ├── llm/              # LLM input/output types, JSON repair utility (jsonRepair.ts)
│   ├── cli.ts            # Main Commander.js CLI application entry point
│   ├── constants.ts      # Global constants, LLM instructions, expected output format
│   ├── scanner.ts        # (Deprecated/Unused: Original local file scanner logic, now delegated to backend)
│   └── types.ts          # Shared TypeScript interfaces and types
├── docs/                 # Project documentation (CLI usage, developer guide, setup)
├── .env                  # Environment variables for the CLI (e.g., BACKEND_URL)
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── ...                   # Other configuration files (eslint, prettier)
```

This section focuses on the `src/` directory, which contains the core client-side logic for the AI Editor CLI.

## Core Concepts

### Client-Server Architecture

The AI Editor operates as a decoupled system:

- **CLI (Client):** The `aicli` tool runs locally on the developer's machine. Its primary roles are user interaction (prompts, diff display), orchestrating the workflow, local Git operations, and communicating with the backend API.
- **Backend Service (Server):** A separate NestJS application (or similar) typically runs on a server. It is responsible for sensitive operations such as direct file system access (reading/writing user code), interaction with large language models (LLMs like Google Gemini), authentication, and potentially advanced file processing (e.g., `.gitignore` parsing, complex scanning logic).

This separation enhances security (CLI doesn't need broad local file permissions), scalability (LLM calls are offloaded), and flexibility (backend can be hosted remotely).

### Authentication

The CLI integrates an OAuth 2.0 flow to authenticate with the backend service. This process is crucial for securing operations that require user identity and authorization.

- **Flow:** When a user runs `aicli login <provider>`, the CLI initiates a local web server to listen for a callback. It then opens the user's browser to the backend's OAuth initiation URL, which includes the CLI's callback port. The user authenticates with the chosen provider (Google/GitHub) via the backend. Upon successful authentication, the backend redirects back to the CLI's local server, providing an access token and user details.
- **Token Storage:** The received authentication token (an `AuthToken` object) is securely stored locally in the user's home directory (`~/.ai-editor-config.json`). This token is then automatically included in the `Authorization` header of all subsequent requests from the CLI to the backend API.
- **Module:** `src/auth/authManager.ts` manages the entire OAuth handshake, token storage, retrieval, and clearing.

### Backend API Communication

The `src/backend-api/BackendApi.ts` module serves as the central client for all interactions with the AI Editor backend service. It acts as an abstraction layer for HTTP requests.

- **Encapsulation:** It provides type-safe methods for backend endpoints like `scanProject`, `callLLM`, `createFile`, `writeFile`, and `deleteFile`.
- **Authentication Handling:** Crucially, it automatically includes the stored access token in the `Authorization: Bearer <token>` header for every outgoing request, ensuring that all backend interactions are authenticated and authorized.
- **Error Handling:** It includes robust error handling for API responses, parsing backend error messages, and providing clear feedback to the user.

### Scanning (Delegated)

The CLI no longer directly scans the local file system. Instead, file scanning is a delegated operation performed by the backend service.

- **Process:** When `aicli scan` is executed or the `generate` command requires project context, the CLI sends the target `scanPaths` (directories/files) and the `projectRoot` (absolute path to the project) to the backend's `/api/file/scan` endpoint via `BackendApi.scanProject()`.
- **Backend Responsibility:** The backend performs the actual recursive file traversal, reads file contents, filters based on `.gitignore` (if configured on the backend), and returns a list of `ScannedFile` objects. This separation offloads file system intensive tasks and avoids requiring broad file system permissions for the CLI itself.

### Context Preparation (Client-side & Delegated)

For `generate` commands, preparing the context for the LLM is a hybrid responsibility.

- **CLI's Role:** The CLI constructs the initial `LLMInput` object, including the `userPrompt`, `projectRoot`, `scanPaths`, and predefined `additionalInstructions` and `expectedOutputFormat` (from `src/constants.ts`).
- **Backend's Role:** This `LLMInput` is then sent to the backend's LLM generation endpoint (`/api/llm/generate-llm`). The backend is responsible for using the `scanPaths` to gather actual `relevantFiles` content (via its own file scanning service), constructing a `projectStructure` representation (e.g., a directory tree string), combining all this information with the CLI-provided prompt and instructions, and preparing the final, comprehensive prompt for its internal LLM.

### LLM Orchestration (Delegated)

The actual interaction with the Large Language Model (e.g., Google Gemini API) is handled _entirely_ by the backend service.

- **Process:** The CLI's `BackendApi.callLLM()` method simply sends the fully prepared `LLMInput` to the backend. The backend is then responsible for:
  - Building the final, context-rich prompt for the LLM.
  - Making the actual API call to the Gemini API or other LLM provider.
  - Parsing and potentially repairing the raw JSON response received from the LLM (e.g., using a server-side equivalent of `jsonRepair.ts`).
  - Validating the structure and content of the LLM's output against the `LLMOutput` interface.
  - Logging raw LLM responses for debugging/auditing purposes.
  - Returning the structured `LLMOutput` object to the CLI.

### File Operations (Delegated)

Similar to scanning, direct file system modifications (creating, writing, deleting files/directories) are delegated to the backend.

- **Process:** When the user confirms changes proposed by the LLM, the `src/file-operations/fileApplier.ts` module does _not_ directly manipulate files. Instead, it uses the `BackendApi` to send corresponding requests (`/api/file/create`, `/api/file/write`, `/api/file/delete`) to the backend's file service endpoints.
- **Backend Responsibility:** The backend then executes these operations on its local file system (which is assumed to be the target project directory). This design separates the user-facing CLI from privileged file system access, improving security and consistency.

### Git Integration (Local)

Git operations are a unique responsibility of the CLI, performed directly on the local machine where the CLI is run.

- **Operations:** The `src/git-operations/gitManager.ts` module handles tasks such as:
  - Checking if a directory is a Git repository.
  - Creating and checking out new Git branches.
  - Staging modified, added, or deleted files.
  - Retrieving the current branch name.
- **Reasoning:** These operations are inherently local to the developer's environment and do not require interaction with the remote backend, ensuring immediate feedback and control over the local repository state.

## Modules (Detailed)

### `src/auth/authManager.ts`

- **Responsibility:** Manages the entire OAuth 2.0 authentication flow for the CLI. This includes starting a temporary HTTP server, opening the browser for user consent, capturing the authentication callback, and securely storing/retrieving the `AuthToken` in a user-specific configuration file (`~/.ai-editor-config.json`).
- **Key Functions:** `startOAuthWebServer`, `openAuthUrl`, `storeAuthToken`, `getAuthToken`, `clearAuthToken`.

### `src/backend-api/BackendApi.ts`

- **Responsibility:** Provides a type-safe client for interacting with the AI Editor backend API. It abstracts away direct HTTP requests, automatically including the authentication token in headers for `scanProject`, `callLLM`, `createFile`, `writeFile`, and `deleteFile`.
- **Key Components:** `BackendApi` class with methods mapping to backend endpoints.

### `src/file-operations/diffGenerator.ts`

- **Responsibility:** Generates human-readable diffs between two text contents using the `diff` library and `chalk` for colored console output. This is a local CLI operation performed to present proposed `modify` changes to the user for review.
- **Key Functions:** `generateUnifiedDiff`.

### `src/file-operations/fileApplier.ts`

- **Responsibility:** Orchestrates the application of proposed file changes (`add`, `modify`, `delete`). It does **not** directly interact with the file system; instead, it delegates these operations by calling the appropriate methods on the `BackendApi` client, which in turn communicates with the backend's file service.
- **Key Functions:** `applyFileChange`.

### `src/git-operations/gitManager.ts`

- **Responsibility:** Manages various local Git operations. It directly interacts with the local Git repository using the `simple-git` library to check repository status, create branches, stage files, and retrieve the current branch name.
- **Key Functions:** `isGitRepository`, `createBranch`, `stageFiles`, `getCurrentBranch`.

### `src/cli.ts` (CLI Entry Point)

- **Responsibility:** The main entry point of the CLI application. It uses `commander` to parse command-line arguments and `inquirer` for interactive prompts. It orchestrates the entire workflow: authenticating users, initiating backend calls (via `BackendApi`) for scanning and LLM invocation, presenting changes (using `diffGenerator`), prompting for user review, and finally sending confirmed changes to the backend (via `fileApplier`) and performing local Git operations (`gitManager`).
- **Key Commands:** `scan`, `generate`, `login`, `logout`, `whoami`.

### `src/constants.ts`

- **Responsibility:** Defines global constants used throughout the CLI, most notably the detailed `INSTRUCTION` and `ADDITIONAL_INSTRUCTION_EXPECTED_OUTPUT` strings that are sent to the LLM via the backend to guide its behavior and output format.

### `src/llm/jsonRepair.ts`

- **Responsibility:** Provides utility functions, primarily `repairJsonBadEscapes`, to attempt to fix common malformed JSON escape sequence issues that might arise from LLM outputs. While the backend is primarily responsible for robust JSON parsing and repair, this module exists as a client-side utility or a conceptual component for understanding robust LLM output handling. The CLI expects the backend to return valid `LLMOutput` JSON, meaning the backend would typically apply similar repair logic before sending the response.

### `src/scanner.ts` (Deprecated/Unused)

- **Responsibility:** This file contains logic for scanning local project files. However, in the current architecture, all file scanning is delegated to the backend service via `BackendApi.scanProject()`. This file is largely vestigial in the CLI's current execution flow, but remains for historical context or potential future local-only scanning capabilities.

### `src/types.ts`

- **Responsibility:** Defines the core TypeScript interfaces and types used across both the CLI and conceptually by the backend, ensuring strong type safety and clarity in data structures. These include `ScannedFile`, `ProposedFileChange`, `LLMInput`, `LLMOutput`, and `AuthToken`.
