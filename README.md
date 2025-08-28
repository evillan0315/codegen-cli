# CodeGen Cli

An AI-powered code editor designed to assist developers with intelligent code generation, refactoring, and general code manipulation directly within their project structure.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#usage)
  - [Running the Backend and Frontend](#running-the-backend-and-frontend)
  - [CLI Usage Examples](#cli-usage-examples)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)

## Features

- **AI-Powered Code Assistance**: Leverage large language models for code generation, refactoring, and debugging suggestions.
- **File Operations**: Seamless integration with local file systems for reading and writing code.
- **Git Integration**: Basic Git operations (e.g., diff generation) to track changes.
- **User Interface**: A responsive web interface built with React to interact with the AI editor.
- **Authentication**: Secure user authentication for accessing the editor functionalities.

## Getting Started

To get a copy of the project up and running on your local machine for development and testing purposes, follow these steps.

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (LTS version recommended)
- npm or yarn
- Git
- **AI Editor Backend service running and accessible.** The CLI communicates with this service for all AI and file system operations.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/evillan0315/codegen-cli.git
    cd codegen-cli
    ```

2.  **Install dependencies for the backend (root directory):**

    ```bash
    npm install
    # or yarn install
    ```

3.  **Install dependencies for the frontend (`apps/ai-editor-front`):**
    ```bash
    cd apps/ai-editor-front
    npm install
    # or yarn install
    cd ../..
    ```

### Configuration

Create a `.env` file in the project root and in `apps/ai-editor-front` based on the `.env.example` (if present) or refer to `docs/google-gemini-setup.md` for AI API key configuration.

Example `.env` (root):

```env
PORT=3000
BACKEND_URL=http://localhost:3000 # Important for CLI to connect to the backend
# AI_API_KEY=YOUR_GEMINI_API_KEY # This is for the backend service, not the CLI
# AI_MODEL=gemini-pro
```

Example `.env` (`apps/ai-editor-front`):

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Usage

### Running the Backend and Frontend

1.  **Start the backend server:**
    From the project root:

    ```bash
    npm start
    # or node src/cli.ts start
    ```

    The backend server will typically run on `http://localhost:3000` (or your configured `PORT`).

2.  **Start the frontend development server:**
    From the `apps/ai-editor-front` directory:

    ```bash
    cd apps/ai-editor-front
    npm run dev
    ```

    The frontend application will typically open in your browser at `http://localhost:5173` (or Vite's default).

3.  **Access the AI Editor:**
    Navigate to the frontend URL in your web browser. You will be able to log in (if authentication is set up) and use the AI editing features.

### CLI Usage Examples

The AI Editor CLI (`aicli`) allows you to interact with the AI Editor backend directly from your terminal. Ensure your backend service is running and configured (see [Configuration](#configuration)).

For a full guide to all CLI commands and options, refer to the [CLI Usage Guide](docs/cli-usage.md).

**1. Authenticate with the Backend (Login)**

Before using `generate` or `scan`, you need to log in to the backend service. This command will open a browser for OAuth.

```bash
aicli login google
# or for GitHub
aicli login github

# Specify a different local port for the callback if 8080 is in use
aicli login google --port 8081
```

**2. Check Authenticated User**

Verify who is currently logged in.

```bash
aicli whoami
```

**3. Scan Project Files**

Scan files and directories to understand the project structure. This delegates to the backend.

```bash
# Scan the current directory and its subdirectories
aicli scan

# Scan specific files or directories
aicli scan src tests/unit

# Scan verbosely and show content snippets
aicli scan --verbose --show-content src/utils.ts
```

**4. Generate or Modify Code**

Instruct the AI to generate or modify code based on a natural language prompt. This is the core functionality.

```bash
# Generate code based on a prompt, scanning the current directory
aicli generate "Add a new utility function to src/utils.ts that formats dates as 'YYYY-MM-DD'."

# Generate code in a specific project root, scanning specific directories
aicli generate "Refactor the authentication logic in auth/ to use a new JWT strategy." --path /path/to/my/project --scan-dirs auth

# Auto-confirm all changes (USE WITH EXTREME CAUTION!)
aicli generate "Fix all linting errors in src/" --yes

# Generate changes without involving Git (no new branch, no staging)
aicli generate "Implement a new feature." --no-git

# Specify a custom branch name for Git operations
aicli generate "Improve performance of data processing" --branch perf-optimization-ai
```

**5. Log Out**

Clear your stored authentication token.

```bash
aicli logout
```

## Project Structure

```
ai-editor/
├── apps/
│   └── ai-editor-front/  # Frontend React application
│       ├── public/
│       ├── src/
│       └── ...
├── src/                  # Backend Node.js application
│   ├── auth/
│   ├── file-operations/
│   ├── git-operations/
│   ├── llm/
│   ├── scanner.ts
│   ├── cli.ts
│   └── ...
├── docs/                 # Documentation
├── .env                  # Environment variables (backend)
├── .env.example
├── package.json
├── README.md
└── ...
```

## Technologies Used

- **Backend**: Node.js, Express (or similar framework for API)
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **AI**: Google Gemini API
- **State Management (Frontend)**: Nanostores (or similar lightweight store)
- **Version Control**: Git

## Contributing

Please read `CONTRIBUTING.md` for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## Author

Made with love by [Eddie Villanueva](https://github.com/evillan0315)  
📧 [evillan0315@gmail.com](mailto:evillan0315@gmail.com)
