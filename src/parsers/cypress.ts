import fs from "fs";
import path from "path";

export interface FailedTest {
  title: string;
  fullTitle: string;
  code: string;
  errorMessage: string;
  errorStack: string;
  sourceFilePath: string | null;
  sourceLine: number | null;
}

/**
 * example input:
 * "at Context.eval (webpack:///./cypress/e2e/login.spec.cy.ts:36:31)"
 *
 * example output:
 * { filePath: "cypress/e2e/login.spec.cy.ts", line: 36 }
 */
function extractPathFromStack(
  estack: string,
): { filePath: string; line: number } | null {
  // webpack:///./cypress/e2e/login.spec.cy.ts:36:31
  const webpackMatch = estack.match(/webpack:\/\/\/\.\/([^:]+):(\d+):\d+/);
  if (webpackMatch) {
    return {
      filePath: webpackMatch[1], // "cypress/e2e/login.spec.cy.ts"
      line: parseInt(webpackMatch[2], 10), // 36
    };
  }

  // without webpack : at Context.eval (./cypress/e2e/login.spec.cy.ts:36:31)
  const plainMatch = estack.match(/\(\.\/([^:]+):(\d+):\d+\)/);
  if (plainMatch) {
    return {
      filePath: plainMatch[1],
      line: parseInt(plainMatch[2], 10),
    };
  }

  return null;
}

/**
 *
 * read Mochawesome json file extract failed cases
 * extract file path for each fail
 * add to root of project
 *
 * @param jsonPath  - mochawesome output JSON path
 * @param projectRoot - root (default: process.cwd())
 */
export function parseCypressResults(
  jsonPath: string,
  projectRoot: string = process.cwd(),
): FailedTest[] {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Result file not found: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const json = JSON.parse(raw);

  const failedTests: FailedTest[] = [];

  // Mochawesome report structure: results[] > suites[] > tests[]
  function walkSuites(suites: any[]) {
    for (const suite of suites) {
      // search for tests
      if (suite.tests) {
        for (const test of suite.tests) {
          if (test.fail === true) {
            const stackInfo = extractPathFromStack(test.err?.estack || "");

            // combine file path and root
            let resolvedPath: string | null = null;
            if (stackInfo) {
              const candidate = path.join(projectRoot, stackInfo.filePath);
              resolvedPath = fs.existsSync(candidate) ? candidate : null;
            }

            failedTests.push({
              title: test.title,
              fullTitle: test.fullTitle,
              code: test.code || "",
              errorMessage: test.err?.message || "Unknown error",
              errorStack: test.err?.estack || "",
              sourceFilePath: resolvedPath,
              sourceLine: stackInfo?.line || null,
            });
          }
        }
      }

      if (suite.suites) {
        walkSuites(suite.suites);
      }
    }
  }

  if (json.results) {
    for (const result of json.results) {
      if (result.suites) {
        walkSuites(result.suites);
      }
    }
  }

  return failedTests;
}
