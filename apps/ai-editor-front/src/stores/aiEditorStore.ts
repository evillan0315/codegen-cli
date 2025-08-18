import { map } from "nanostores";

export interface AiEditorStoreType {
  prompt: string;
  systemInstruction: string;
  response: {
    newContent: string;
    currentContent: string;
    type: "insert" | "replace" | "delete";
  } | null;
  isLoading: boolean;
  lastAppliedContent: string; // Added to simulate content application
}

export const aiEditorStore = map<AiEditorStoreType>({
  prompt: "Refactor this code to be more concise.",
  systemInstruction:
    "You are an expert TypeScript/React developer. Provide concise and clean code.",
  response: null,
  isLoading: false,
  lastAppliedContent: "",
});

export const generateResponse = async (
  prompt: string,
  systemInstruction: string,
) => {
  aiEditorStore.setKey("isLoading", true);
  aiEditorStore.setKey("prompt", prompt);
  aiEditorStore.setKey("systemInstruction", systemInstruction);

  // Simulate an API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const mockResponseContent = `// Refactored code based on your prompt:\nimport React from 'react';\n\ninterface Props {\n  count: number;\n}\n\nconst Counter: React.FC<Props> = ({ count }) => (\n  <div className="text-xl font-bold">Count: {count}</div>\n);\n\nexport default Counter;\n\n// Added system instruction for context: "${systemInstruction}"`;

  aiEditorStore.setKey("response", {
    newContent: mockResponseContent,
    currentContent: `// Original content (for context/diff)\ninterface Props { count: number; }\nconst Counter = ({ count }: Props) => {\n  return (\n    <div>\n      <p>Current Count: {count}</p>\n    </div>\n  );\n};\nexport default Counter;`,
    type: "replace",
  });
  aiEditorStore.setKey("isLoading", false);
};

export const applyEditedContent = (content: string) => {
  console.log("Applying edited content:", content);
  aiEditorStore.setKey("lastAppliedContent", content);
  // In a real application, this would update the actual file or editor content
  // and potentially clear the response state if the changes are committed.
  // For this example, we'll keep the response visible.
  // aiEditorStore.setKey('response', null);
};
