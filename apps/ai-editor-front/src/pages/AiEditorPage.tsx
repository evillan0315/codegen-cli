import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { INSTRUCTION, ADDIONAL_INSTRUCTION_EXPECTED_OUTPUT } from "../constants"; // Import constants
import { joinPaths, getRelativePath } from "../utils"; // Import utility functions including joinPaths and getRelativePath
import { callLLM } from "../api/llm"; // NEW: Import LLM API service
import {
  createFile,
  writeFile,
  deleteFile,
  openDirectoryPicker,
} from "../api/file"; // NEW: Import File API services and openDirectoryPicker
import type {
  FrontendProposedFileChange,
  LLMOutput,
  LLMInput, // NEW: Import LLMInput
} from "../types/index";

// Define a type for the AI response that can be either structured LLMOutput or raw text
type AiResponseContent = LLMOutput | string | null;

// Component for displaying a single proposed file change
interface FileChangeDisplayProps {
  change: FrontendProposedFileChange;
  onStatusChange: (
    filePath: string,
    status: "pending" | "accepted" | "rejected",
  ) => void;
}

function FileChangeDisplay({ change, onStatusChange }: FileChangeDisplayProps) {
  const {
    filePath,
    action,
    newContent,
    reason,
    status,
  } = change;

  const statusClasses = {
    pending: "border-blue-400 text-blue-200",
    accepted: "border-green-400 text-green-200",
    rejected: "border-red-400 text-red-200",
  };

  return (
    <div
      className={`p-4 mb-4 rounded-lg border ${statusClasses[status]} shadow-lg bg-gray-800`}
    >
      <div className="flex justify-between items-center mb-2 flex-wrap">
        <h3 className="text-xl font-semibold flex-grow min-w-0">
          <span className="font-mono text-indigo-300 break-all">
            {filePath}
          </span>
          <span
            className={`ml-3 px-2 py-1 rounded-full text-xs font-bold ${
              action === "add"
                ? "bg-green-600"
                : action === "modify"
                  ? "bg-yellow-600"
                  : "bg-red-600"
            }`}
          >
            {action.toUpperCase()}
          </span>
        </h3>
        <div className="flex space-x-2 mt-2 md:mt-0 flex-shrink-0">
          <Button
            className={`text-sm px-3 py-1 ${status === "accepted" ? "bg-green-700" : "bg-gray-700 hover:bg-green-600"}`}
            onClick={() => onStatusChange(filePath, "accepted")}
            disabled={status === "accepted"}
          >
            Accept
          </Button>
          <Button
            className={`text-sm px-3 py-1 ${status === "rejected" ? "bg-red-700" : "bg-gray-700 hover:bg-red-600"}`}
            onClick={() => onStatusChange(filePath, "rejected")}
            disabled={status === "rejected"}
          >
            Reject
          </Button>
          <Button
            className={`text-sm px-3 py-1 ${status === "pending" ? "bg-blue-700" : "bg-gray-700 hover:bg-blue-600"}`}
            onClick={() => onStatusChange(filePath, "pending")}
            disabled={status === "pending"}
          >
            Reset
          </Button>
        </div>
      </div>
      {reason && <p className="text-sm text-gray-400 mb-2">Reason: {reason}</p>}

      {action === "add" && newContent && (
        <div>
          <h4 className="font-medium text-gray-300 mb-1">New Content:</h4>
          <pre className="bg-gray-900 p-3 rounded-md overflow-auto text-xs text-gray-200">
            <code>{newContent}</code>
          </pre>
        </div>
      )}

      {action === "modify" && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            {/* Original content cannot be displayed dynamically if not provided by the AI response */}
            <h4 className="font-medium text-gray-300 mb-1">
              Original Content: (Not available from AI response)
            </h4>
            <pre className="bg-gray-900 p-3 rounded-md overflow-auto text-xs text-gray-200">
              <code>{/* Placeholder or fetch from backend if available */}
              </code>
            </pre>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-300 mb-1">New Content:</h4>
            <pre className="bg-gray-900 p-3 rounded-md overflow-auto text-xs text-gray-200">
              <code>{newContent}</code>
            </pre>
          </div>
        </div>
      )}

      {action === "delete" && (
        <p className="text-red-300 italic">This file will be deleted.</p>
      )}
    </div>
  );
}

export function AiEditorPage() {
  const [prompt, setPrompt] = useState<string>(
    // Initial user-facing prompt. The full instruction and output format will be combined later.
    "Generate TypeScript code to implement a simple React component that displays a welcome message. The component should be named WelcomeMessage.tsx and export a functional component.",
  );
  // State for directories to scan (these paths are RELATIVE to projectRootForAI)
  const [scanDirectories, setScanDirectories] = useState<string>(
    "apps/ai-editor-front/src", // Default to the app's src directory, assuming it's the initial project root
  );
  // State for the absolute path of the project root the AI will work within
  const [projectRootForAI, setProjectRootForAI] = useState<string>(
    import.meta.env.PROJECT_ROOT, // Initialize with the frontend app's root
  );
  // State for system instructions
  const [systemInstructions, setSystemInstructions] = useState<string>(
    INSTRUCTION, // Initialize with the default system instruction constant
  );
  // NEW: State for expected output format
  const [expectedOutputFormat, setExpectedOutputFormat] = useState<string>(
    ADDIONAL_INSTRUCTION_EXPECTED_OUTPUT,
  );

  const [isLoading, setIsLoading] = useState(false);
  const [aiResponseContent, setAiResponseContent] = useState<AiResponseContent>(null);
  const [proposedChanges, setProposedChanges] = useState<FrontendProposedFileChange[]>(
    [],
  );

  const handleBrowseScanFolder = useCallback(async () => {
    setIsLoading(true);
    try {
      const selectedAbsolutePath = await openDirectoryPicker();
      if (selectedAbsolutePath) {
        // Calculate path relative to the currently set projectRootForAI
        const relativePath = getRelativePath(
          selectedAbsolutePath,
          projectRootForAI,
        );

        if (relativePath === selectedAbsolutePath && selectedAbsolutePath !== projectRootForAI) {
          // If getRelativePath returns the original absolute path, it means it's not a subpath
          alert(
            `Selected directory '${selectedAbsolutePath}' is not inside the current AI project root '${projectRootForAI}'. Please select a directory within the project root.`, 
          );
          return;
        }

        const currentPaths = scanDirectories
          .split(",")
          .map((dir) => dir.trim())
          .filter((dir) => dir !== "");

        if (!currentPaths.includes(relativePath)) {
          setScanDirectories(
            [...currentPaths, relativePath]
              .filter((p) => p !== "") // Ensure no empty strings from initial split/join
              .join(","),
          );
        } else {
          alert(`Directory '${relativePath}' is already in the scan list.`);
        }
      }
    } catch (error) {
      console.error("Error selecting scan directory:", error);
      alert(`Failed to select scan directory: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [scanDirectories, projectRootForAI]);

  const handleBrowseProjectRoot = useCallback(async () => {
    setIsLoading(true);
    try {
      const selectedAbsolutePath = await openDirectoryPicker();
      if (selectedAbsolutePath) {
        setProjectRootForAI(selectedAbsolutePath);
        setScanDirectories(""); // Clear scan directories when project root changes
        alert(`AI Project Root set to: ${selectedAbsolutePath}`);
      }
    } catch (error) {
      console.error("Error selecting new project root:", error);
      alert(`Failed to select new project root: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateClick = useCallback(async () => {
    if (!prompt.trim()) {
      alert("Please enter a prompt.");
      return;
    }

    setIsLoading(true);
    setAiResponseContent(null);
    setProposedChanges([]);

    // Validate projectRootForAI before proceeding
    if (
      !projectRootForAI ||
      typeof projectRootForAI !== "string" ||
      projectRootForAI.trim() === ""
    ) {
      alert(
        "Error: AI Project Root directory is not set or is empty. Please select a valid root.",
      );
      setIsLoading(false);
      return; // Abort the operation
    }

    // Prepare scan paths from input (these are already relative to projectRootForAI)
    const scanPaths = scanDirectories
      .split(",")
      .map((dir) => dir.trim())
      .filter((dir) => dir !== "");

    try {
      const llmInput: LLMInput = {
        userPrompt: prompt.trim(),
        projectRoot: projectRootForAI, // Use the user-selected project root for AI context
        projectStructure: "", // Placeholder: Could be generated via file scanning later
        relevantFiles: [], // Placeholder: Could be populated via file scanning later
        // Use the user-defined system instructions
        additionalInstructions: systemInstructions,
        // Use the user-defined expectedOutputFormat directly
        expectedOutputFormat: expectedOutputFormat,
        scanPaths: scanPaths.length > 0 ? scanPaths : [], // Pass parsed scan paths
      };

      // Call the LLM API service, which returns parsed LLMOutput directly
      const llmOutput: LLMOutput = await callLLM(llmInput);
      console.log("Parsed AI response (LLMOutput):", llmOutput);

      // Basic validation to check if it looks like an LLMOutput
      if (
        llmOutput &&
        typeof llmOutput === "object" &&
        "changes" in llmOutput &&
        Array.isArray(llmOutput.changes) &&
        "summary" in llmOutput &&
        typeof llmOutput.summary === "string"
      ) {
        setAiResponseContent(llmOutput);
        // Initialize proposed changes with 'pending' status
        const initialChanges: FrontendProposedFileChange[] = llmOutput.changes.map((change) => ({
          ...change,
          status: "pending",
        }));
        setProposedChanges(initialChanges);
      } else {
        // If parsing succeeded but didn't match LLMOutput structure, or was empty
        setAiResponseContent(
          "AI response was structured but not in the expected file change format or was empty.\n" +
          JSON.stringify(llmOutput, null, 2),
        );
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
      // If the API call itself failed (e.g., non-2xx status, network error),
      // the error object might contain a message.
      setAiResponseContent(`Failed to generate response: ${(error as Error).message || "Unknown error"}`);
      alert(`Failed to generate response: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, scanDirectories, projectRootForAI, systemInstructions, expectedOutputFormat]); // Add expectedOutputFormat to dependency array

  const handleStatusChange = useCallback(
    (filePath: string, status: "pending" | "accepted" | "rejected") => {
      setProposedChanges((prevChanges) =>
        prevChanges.map((change) =>
          change.filePath === filePath ? { ...change, status } : change,
        ),
      );
    },
    [],
  );

  const handleApplyChanges = useCallback(async () => {
    const acceptedChanges = proposedChanges.filter(
      (change) => change.status === "accepted",
    );
    if (acceptedChanges.length === 0) {
      alert("No changes accepted to apply.");
      return;
    }

    setIsLoading(true); // Indicate that changes are being applied

    // Validate projectRootForAI before proceeding
    if (
      !projectRootForAI ||
      typeof projectRootForAI !== "string" ||
      projectRootForAI.trim() === ""
    ) {
      alert(
        "Error: AI Project Root directory is not set or is empty. Cannot apply changes.",
      );
      setIsLoading(false);
      return; // Abort the operation
    }

    const operations: Promise<any>[] = [];
    const successfulChanges: string[] = [];
    const failedChanges: { filePath: string; error: string }[] = [];

    for (const change of acceptedChanges) {
      // The filePath from LLMOutput is assumed to be relative to the projectRoot sent to LLM.
      // Backend file operations expect absolute paths, so we join them with projectRootForAI.
      const absoluteFilePath = joinPaths(projectRootForAI, change.filePath);

      let apiCall: Promise<any>;
      switch (change.action) {
        case "add":
          apiCall = createFile(absoluteFilePath, false, change.newContent || "");
          break;
        case "modify":
          apiCall = writeFile(absoluteFilePath, change.newContent || "");
          break;
        case "delete":
          apiCall = deleteFile(absoluteFilePath);
          break;
        default:
          console.warn(`Unknown action type: ${change.action} for ${change.filePath}. Skipping.`);
          continue; // Skip unknown actions
      }

      operations.push(apiCall.then(() => {
        successfulChanges.push(change.filePath); // Track successful changes
      }).catch(error => {
        failedChanges.push({ filePath: change.filePath, error: error.message }); // Track failed changes
        console.error(`Failed to apply change for ${change.filePath}:`, error);
        // Do NOT re-throw here, as Promise.all should resolve even if some caught errors
        // We're handling individual errors and collecting them.
      }));
    }

    try {
      await Promise.all(operations);

      if (failedChanges.length === 0) {
        alert(`Successfully applied ${successfulChanges.length} changes.`);
      } else {
        alert(
          `Applied ${successfulChanges.length} changes, but ${failedChanges.length} failed.\n` +
          `Failed files:\n${failedChanges.map(f => `  - ${f.filePath}: ${f.error}`).join('\n')}`,
        );
      }

      // Reset state after attempting all applications
      setAiResponseContent(null);
      setProposedChanges([]);
      setPrompt("");

    } catch (error) {
      // This catch block would only be hit if one of the promises in 'operations'
      // did not have its error caught and re-threw it, causing Promise.all to reject.
      // With the individual .catch blocks, this specific catch might be less frequently hit,
      // but it's good to keep for robustness.
      console.error("An unexpected error occurred during application of changes:", error);
      alert(`An unexpected error occurred: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [proposedChanges, projectRootForAI]);

  const acceptedCount = proposedChanges.filter(
    (c) => c.status === "accepted",
  ).length;

  const isLlmOutput = (content: AiResponseContent): content is LLMOutput => {
    return (
      content !== null &&
      typeof content === "object" &&
      "changes" in content &&
      Array.isArray(content.changes) &&
      "summary" in content &&
      typeof content.summary === "string"
    );
  };

  return (
    <div className="flex flex-col flex-grow p-4 md:p-8 max-w-full lg:max-w-7xl mx-auto w-full">
      <h1 className="text-4xl font-bold text-white mb-6 text-center">
        AI Editor <span className="text-indigo-400">Frontend</span>
      </h1>

      {/* AI Project Root Directory Section */}
      <div className="p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700 mb-8">
        <h2 className="text-2xl font-semibold text-indigo-300 mb-4">
          AI Project Root Directory
        </h2>
        <div className="flex items-end gap-3">
          <input
            type="text"
            className="flex-grow p-3 rounded-md bg-gray-900 text-gray-100 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            value={projectRootForAI}
            readOnly // Make it read-only, user changes via browse button
            placeholder="Absolute path to the project root for AI operations"
            disabled={isLoading}
          />
          <Button
            onClick={handleBrowseProjectRoot}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 h-fit whitespace-nowrap"
          >
            Browse Project Root
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          This is the base directory the AI will work within. All file paths in proposed changes and scan directories will be relative to this root.
        </p>
      </div>

      {/* Directory Scanning Input Section */}
      <div className="p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700 mb-8">
        <h2 className="text-2xl font-semibold text-indigo-300 mb-4">
          Directories to Scan (for AI Context)
        </h2>
        <div className="flex items-end gap-3">
          <textarea
            className="flex-grow p-3 rounded-md bg-gray-900 text-gray-100 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[90px]"
            rows={3}
            placeholder="Enter comma-separated RELATIVE paths to directories within the AI Project Root (e.g., src/components, backend/src/services)"
            value={scanDirectories}
            onChange={(e) => setScanDirectories(e.target.value)}
            disabled={isLoading}
          ></textarea>
          <Button
            onClick={handleBrowseScanFolder}
            disabled={isLoading}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-3 h-fit whitespace-nowrap"
          >
            Browse Folder (relative to root)
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          These directories will be scanned to provide context to the AI (e.g., file contents, project structure). Paths should be relative to the{" "}
          <span className="font-semibold text-indigo-200">AI Project Root</span> specified above.
        </p>
      </div>

      {/* System Instructions Input Section */}
      <div className="p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700 mb-8">
        <h2 className="text-2xl font-semibold text-indigo-300 mb-4">
          AI System Instructions (Advanced)
        </h2>
        <textarea
          className="w-full p-3 rounded-md bg-gray-900 text-gray-100 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[150px] font-mono text-sm"
          rows={8}
          placeholder="Provide specific instructions to guide the AI's behavior and response style. This overrides the default system prompt."
          value={systemInstructions}
          onChange={(e) => setSystemInstructions(e.target.value)}
          disabled={isLoading}
        ></textarea>
        <p className="text-sm text-gray-400 mt-2">
          This field defines the AI's core behavior and rules.
        </p>
      </div>

      {/* NEW: Expected Output Format Input Section */}
      <div className="p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700 mb-8">
        <h2 className="text-2xl font-semibold text-indigo-300 mb-4">
          Expected AI Output Format (JSON Schema)
        </h2>
        <textarea
          className="w-full p-3 rounded-md bg-gray-900 text-gray-100 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[250px] font-mono text-sm"
          rows={12} // Increased rows for better visibility of JSON
          placeholder="Define the exact JSON structure the AI should return for file changes. This is critical for automated parsing."
          value={expectedOutputFormat}
          onChange={(e) => setExpectedOutputFormat(e.target.value)}
          disabled={isLoading}
        ></textarea>
        <p className="text-sm text-gray-400 mt-2">
          This field instructs the AI on the precise JSON format it should use for its response. Ensure this matches the `LLMOutput` type to enable automated parsing and application of changes. The AI will be explicitly told to return JSON matching this description.
        </p>
      </div>

      {/* Prompt Input Section */}
      <div className="p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700 mb-8">
        <h2 className="text-2xl font-semibold text-indigo-300 mb-4">
          Your Request
        </h2>
        <textarea
          className="w-full p-3 rounded-md bg-gray-900 text-gray-100 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          rows={5}
          placeholder="Describe the changes you want the AI to make (e.g., 'Add a new user authentication module', 'Refactor the data fetching logic in App.tsx to use React Query')."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
        ></textarea>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleGenerateClick}
            disabled={isLoading || !prompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading ? "Generating..." : "Generate AI Changes"}
          </Button>
        </div>
      </div>

      {/* LLM Output and Proposed Changes */}
      {isLoading && (
        <div className="text-center text-indigo-400 text-xl py-8">
          Thinking and generating changes... (Expecting JSON output)
        </div>
      )}

      {!isLoading && aiResponseContent && (
        <div className="p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700 mb-8">
          <h2 className="text-2xl font-semibold text-indigo-300 mb-4">
            AI Proposed Solution
          </h2>
          {isLlmOutput(aiResponseContent) ? (
            <>
              <p className="text-lg text-gray-200 mb-4">
                <span className="font-bold">Summary:</span> {aiResponseContent.summary}
              </p>
              {aiResponseContent.thoughtProcess && (
                <div className="mb-4">
                  <h3 className="text-xl font-medium text-gray-300 mb-2">
                    Thought Process:
                  </h3>
                  <pre className="bg-gray-900 p-3 rounded-md whitespace-pre-wrap text-gray-400 leading-relaxed">
                    {aiResponseContent.thoughtProcess}
                  </pre>
                </div>
              )}

              <h3 className="text-xl font-medium text-gray-300 mb-4 mt-6">
                Review & Apply Changes ({acceptedCount} accepted)
              </h3>
              {proposedChanges.length > 0 ? (
                <div className="space-y-4">
                  {proposedChanges.map((change) => (
                    <FileChangeDisplay
                      key={change.filePath} // Assuming filePath is unique and now relative
                      change={change}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">
                  No changes proposed by the AI for this request.
                </p>
              )}

              {proposedChanges.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleApplyChanges}
                    disabled={acceptedCount === 0 || isLoading} // Disable during application too
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading
                      ? "Applying..."
                      : `Apply ${acceptedCount} Selected Changes`}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-xl font-medium text-gray-300 mb-2">
                AI Response (Raw Text/Error):
              </h3>
              <pre className="bg-gray-900 p-3 rounded-md overflow-auto text-xs text-gray-200 whitespace-pre-wrap">
                <code>{aiResponseContent}</code>
              </pre>
              <p className="text-gray-400 italic mt-2">
                The AI did not return a response in the expected structured JSON format for file changes, or an error occurred.
                Ensure your prompt explicitly asks for JSON matching the LLMOutput interface.
              </p>
            </>
          )}
        </div>
      )}

      {/* Go Back Home */}
      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
