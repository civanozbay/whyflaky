import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { parseCypressResults } from "../parsers/cypress.js";
import { buildPromptFromFailedTest } from "../utils/fileReader.js";
import { askAI } from "../ai/client.js";
const RESULTS_PATH = "cypress/results/testai-output.json";
/**
 * testai run --spec cypress/e2e/login.spec.cy.ts
 *
 * run cypress with mochawesome reporter
 * parse json output
 * analyse fail case
 * show results
 */
export async function runCommand(options) {
    console.log(chalk.cyan.bold("\n▶  Running Cypress tests...\n"));
    // build folder for results
    fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
    if (!options.spec) {
        console.log(chalk.yellow("⚠️  Please provide a path of spec file "));
        process.exit(1);
    }
    const specFlag = `--spec "${options.spec}"`;
    const cypressCmd = [
        "npx cypress run",
        specFlag,
        `--reporter mochawesome`,
        `--reporter-options "reportDir=cypress/results,reportFilename=testai-output,overwrite=true,html=false,json=true"`,
    ].join(" ");
    try {
        execSync(cypressCmd, { stdio: "inherit" });
        console.log(chalk.green("\n✅ All tests passed! Nothing to analyze.\n"));
        return;
    }
    catch {
        // Catch non-zero exit code on Cypress fail
        console.log(chalk.yellow("\n⚠️  Some tests failed. Analyzing...\n"));
    }
    // ---- Second phase: parse Json ----
    const spinner = ora("Reading test results...").start();
    let failedTests;
    try {
        failedTests = parseCypressResults(RESULTS_PATH, process.cwd());
        spinner.succeed(`Found ${failedTests.length} failed test(s)`);
    }
    catch (err) {
        spinner.fail(`Could not read results: ${err instanceof Error ? err.message : err}`);
        console.log(chalk.gray(`\nExpected results at: ${RESULTS_PATH}`));
        console.log(chalk.gray("Make sure mochawesome is installed: npm install --save-dev mochawesome"));
        process.exit(1);
    }
    if (failedTests.length === 0) {
        console.log(chalk.green("✅ No failed tests found in results.\n"));
        return;
    }
    // --- Third phase : AI Analysis for each fail ---
    for (let i = 0; i < failedTests.length; i++) {
        const test = failedTests[i];
        console.log(chalk.red.bold(`\n${"─".repeat(55)}`));
        console.log(chalk.red.bold(`  ❌ FAILED TEST ${i + 1}/${failedTests.length}`));
        console.log(chalk.red.bold(`${"─".repeat(55)}`));
        console.log(chalk.white(`  ${test.fullTitle}`));
        console.log(chalk.gray(`  ${test.errorMessage}\n`));
        if (test.sourceFilePath) {
            console.log(chalk.gray(`  📄 File: ${test.sourceFilePath}`));
            if (test.sourceLine) {
                console.log(chalk.gray(`  📍 Line: ${test.sourceLine}`));
            }
        }
        const aiSpinner = ora("  AI analyzing...").start();
        const prompt = buildPromptFromFailedTest(test);
        const result = await askAI(prompt);
        if (!result.success) {
            aiSpinner.fail("AI analysis failed");
            console.log(chalk.red(`  ${result.error}\n`));
            continue;
        }
        aiSpinner.succeed("Analysis complete");
        console.log(chalk.cyan.bold("\n  🔍 AI Analysis:\n"));
        result.text.split("\n").forEach((line) => {
            console.log(`  ${line}`);
        });
    }
    // --- Fourth phase : Summary ---
    console.log(chalk.cyan.bold(`\n${"─".repeat(55)}`));
    console.log(chalk.cyan.bold(`  📊 Summary: ${failedTests.length} test(s) analyzed`));
    console.log(chalk.cyan.bold(`${"─".repeat(55)}\n`));
}
