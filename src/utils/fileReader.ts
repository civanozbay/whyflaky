import fs from "fs";
import path from "path";
import type { FailedTest } from "../parsers/cypress.js";

export interface TestFileContext {
  testFilePath: string;
  testFileContent: string;
  importedFiles: Array<{ path: string; content: string }>;
}

/**
 * Read a test file and follow its imports 1 level deep.
 * This gives AI the context it needs to understand WHY a test fails.
 *
 * Example: test imports { checkout } from '../checkout.ts'
 * → We also read checkout.ts so AI can see the actual implementation
 */
export function readTestWithContext(testFilePath: string): TestFileContext {
  const absolutePath = path.resolve(testFilePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const testFileContent = fs.readFileSync(absolutePath, "utf-8");
  const importedFiles: Array<{ path: string; content: string }> = [];

  // Find all local imports (skip node_modules, only relative paths)
  // Matches: import ... from './foo' or import ... from '../bar'
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
  const dir = path.dirname(absolutePath);

  let match;
  while ((match = importRegex.exec(testFileContent)) !== null) {
    const importPath = match[1];

    // Try common extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
    for (const ext of extensions) {
      const fullPath = path.resolve(dir, importPath + ext);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          importedFiles.push({ path: fullPath, content });
          break;
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  return {
    testFilePath: absolutePath,
    testFileContent,
    importedFiles,
  };
}

/**
 * Build a prompt that includes test file + imported source files
 * so AI has full context to explain the failure
 */
export function buildContextPrompt(
  context: TestFileContext,
  errorMessage: string,
): string {
  let prompt = `Here is a failing test and its related source files. Please analyze the failure.

ERROR MESSAGE:
${errorMessage}

TEST FILE (${path.basename(context.testFilePath)}):
\`\`\`typescript
${context.testFileContent}
\`\`\`
`;

  if (context.importedFiles.length > 0) {
    prompt += `\nSOURCE FILES IMPORTED BY THE TEST:\n`;
    for (const file of context.importedFiles) {
      prompt += `
File: ${path.basename(file.path)}
\`\`\`typescript
${file.content}
\`\`\`
`;
    }
  }

  prompt += `
Based on the test code, source code, and error message above:
1. What is the ROOT CAUSE of this failure?
2. What is the exact problem in the code?
3. How should it be fixed?`;

  return prompt;
}

export function buildPromptFromFailedTest(test: FailedTest): string {
  let prompt = `You are analyzing a failing Cypress test. Here is everything we know:\n\n`;

  prompt += `TEST: ${test.fullTitle}\n`;
  prompt += `\nERROR:\n${test.errorMessage}\n`;
  prompt += `\nSTACK TRACE:\n${test.errorStack}\n`;

  if (test.code) {
    prompt += `\nTEST CODE SNIPPET (from test runner):\n\`\`\`typescript\n${test.code}\n\`\`\`\n`;
  }

  if (test.sourceFilePath) {
    try {
      const context = readTestWithContext(test.sourceFilePath);
      prompt += `\nFULL TEST FILE (${path.basename(context.testFilePath)}):\n\`\`\`typescript\n${context.testFileContent}\n\`\`\`\n`;

      if (context.importedFiles.length > 0) {
        prompt += `\nIMPORTED FILES (page objects, helpers, utilities):\n`;
        for (const file of context.importedFiles) {
          prompt += `\nFile: ${path.basename(file.path)}\n\`\`\`typescript\n${file.content}\n\`\`\`\n`;
        }
      }
    } catch {
      prompt += `\n(Could not read full test file, analyzing from snippet only)\n`;
    }
  } else {
    prompt += `\n(Source file could not be located on disk, analyzing from snippet only)\n`;
  }

  prompt += `
Based on all the above:
1. What is the ROOT CAUSE of this failure?
2. Is this likely a flaky test, a real bug, or a timing issue?
3. What is the exact fix?`;

  return prompt;
}
