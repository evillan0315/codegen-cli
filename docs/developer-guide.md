# Developer Guide

This guide provides an in-depth overview of the AI Editor project's architecture, core concepts, and module responsibilities, aimed at developers looking to understand and contribute to the CLI tool. It focuses on the CLI's role as a client interacting with a separate backend service for AI processing and file system operations.

## Project Overview

AI Editor CLI is a command-line client that orchestrates AI-powered code editing tasks. It interacts with a dedicated backend service to scan project files, prepare context for an LLM, generate proposed changes, and apply those changes to the file system. Local responsibilities of the CLI include user authentication, presenting diffs for review, and managing Git operations. The core principle is that resource-intensive and sensitive operations (like direct file system modifications and LLM calls) are offloaded to a trusted backend.

## Getting Started

For basic setup, installation, and usage instructions for both the CLI tool and the frontend application, please refer to the main [README.md](../README.md) in the project root.

### Prerequisites (Specific to CLI Development)

- Node.js (version >= 18)
- npm or yarn
- **AI Editor Backend service running and accessible.** The CLI communicates with this service for all AI and file system operations.
- `BACKEND_URL` environment variable set in the CLI's environment (e.g., in its `.env` file) to the URL of your running backend service (e.g., `http://localhost:3000`).
- A Google Gemini API key (or other LLM provider keys) configured on your **backend service**. Refer to the backend's documentation for details, and [Setting up Google Gemini API Key](google-gemini-setup.md) for general information on obtaining the key.

## Project Structure (CLI Tool Focus)

```
.
├── src # Core CLI Tool Source
│   ├── auth              # Authentication logic (OAuth, token management)
│   ├── backend-api       # Client for backend API communication
│   ├── file-operations   # Local diff generation, delegates apply to backend
│   ├── git-operations    # Local Git interactions
│   ├── index.ts          # Main CLI entry point
│   ├── llm               # LLM input/output types (actual calls via backend-api)
│   └── types.ts          # Shared TypeScript types
```

This section focuses on the `src/` directory, which contains the core client-side logic for the AI Editor CLI.

## Core Concepts

### Authentication

The CLI integrates an OAuth 2.0 flow to authenticate with the backend service. The `src/auth/authManager.ts` module facilitates this by:

- Starting a temporary local web server to receive the OAuth callback from the backend.
- Opening the browser to the backend's OAuth initiation endpoint.
- Storing the received authentication token locally in the user's home directory (`.ai-editor-config.json`).
- Providing functions to retrieve, store, and clear this token.

All subsequent requests from the CLI to the backend API include this stored access token for authorization.

### Backend API Communication

The `src/backend-api/BackendApi.ts` module acts as the central client for all interactions with the AI Editor backend service. It encapsulates HTTP requests for file scanning, LLM calls, and file system modifications, ensuring that authentication tokens are correctly included in outgoing requests. This module is the sole interface through which the CLI communicates with the backend's core services.

### Scanning (Delegated)

The CLI no longer directly scans the file system. Instead, when a `scan` command is issued or `generate` requires project context, the CLI sends the specified `scanPaths` and `projectRoot` to the backend's file scanning endpoint (`/api/file/scan`). The backend performs the recursive file traversal, content reading, and returns `ScannedFile` objects to the CLI. This delegation ensures the CLI does not require broad file system permissions on the target machine where the code is being edited.

### Context Preparation (Client-side & Delegated)

For `generate` commands, the CLI constructs the `LLMInput` object containing the `userPrompt`, `projectRoot`, `scanPaths`, and predefined `additionalInstructions` and `expectedOutputFormat`. This object is then sent to the backend's LLM generation endpoint (`/api/llm/generate-llm`). The backend is responsible for using the `scanPaths` to gather actual `relevantFiles` content and `projectStructure` representation, combining them with the CLI-provided prompt and instructions, and preparing the final prompt for its internal LLM.

### LLM Orchestration (Delegated)

The actual interaction with the Google Gemini API (or any other LLM) is handled _entirely_ by the backend service. The CLI's `callLLM` method in `src/backend-api/BackendApi.ts` simply sends the `LLMInput` to the backend. The backend is responsible for:

- Building the full prompt for the LLM.
- Calling the Gemini API.
- Parsing and repairing the JSON response from the LLM.
- Validating the structure of the LLM output.
- Logging raw LLM responses for debugging/auditing.
- Returning the structured `LLMOutput` to the CLI.

### File Operations (Delegated)

The CLI no longer directly performs file system operations (create, write, delete). Instead, the `src/file-operations/fileApplier.ts` module uses the `BackendApi` to send requests to the backend's file service endpoints (`/api/file/create`, `/api/file/write`, `/api/file/delete`). The backend then executes these operations on its local file system (which should be the target project directory). This design separates the UI/orchestration concerns from the privileged file system access.

### Git Integration (Local)

Git operations, such as checking repository status, creating branches, and staging files, remain a local responsibility of the CLI. The `src/git-operations/gitManager.ts` module directly interacts with the local Git repository using `simple-git`. This is the _only_ direct file system interaction performed by the CLI itself, as it operates on the local Git repository.

## Modules (Detailed)

### `src/auth/authManager.ts`

Manages the OAuth 2.0 authentication flow for the CLI. It starts a temporary HTTP server, opens the browser for user consent, captures the authentication callback, and securely stores/retrieves the access token in a user-specific configuration file.

### `src/backend-api/BackendApi.ts`

Provides a type-safe client for interacting with the AI Editor backend API. It abstracts away the HTTP requests for `scanProject`, `callLLM`, `createFile`, `writeFile`, and `deleteFile`, automatically including the authentication token. This module is the primary interface for the CLI to communicate with the backend.

### `src/file-operations/diffGenerator.ts`

Responsible for generating human-readable diffs between two text contents using `diff` and `chalk` for colored output. This operation is performed locally by the CLI to present changes to the user before application.

### `src/file-operations/fileApplier.ts`

Handles the application of proposed file changes by sending corresponding requests (add, modify, delete) to the backend API via the `BackendApi` client. It does _not_ directly perform file system operations; instead, it delegates these actions to the backend service.

### `src/git-operations/gitManager.ts`

Manages various local Git operations, allowing the CLI to interact with the local repository. It leverages the `simple-git` library to check repository status, create branches, stage files, and retrieve the current branch name. These operations are performed directly by the CLI on the local machine.

### `src/index.ts` (CLI Entry Point)

The main entry point of the CLI application. It uses `commander` to parse command-line arguments and `inquirer` for interactive prompts. It orchestrates the entire workflow: authenticating, initiating backend calls via `BackendApi` for scanning and LLM invocation, presenting changes (using `diffGenerator`), prompting for user review, and finally sending confirmed changes to the backend (via `fileApplier`) and performing local Git operations.

### `src/llm/jsonRepair.ts`

Provides utility functions to extract JSON from markdown blocks and repair common JSON escape sequence issues. This module is used by the CLI to robustly parse the JSON response received from the backend's LLM endpoint.

### `src/types.ts`

Defines the core TypeScript interfaces and types used across the CLI tool, including `ScannedFile`, `ProposedFileChange`, `LLMInput`, `LLMOutput`, and `AuthToken`, ensuring strong type safety and clarity in data structures.
