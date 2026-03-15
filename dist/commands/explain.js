import chalk from "chalk";
import ora from "ora";
import { askAI } from "../ai/client.js";
import { readTestWithContext, buildContextPrompt } from "../utils/fileReader.js";
/**
 * testai explain --file src/checkout.test.ts --error "Expected 200 but got 404"
 *
 * What it does:
 * 1. Reads the test file
 * 2. Reads files the test imports (so AI sees source code too)
 * 3. Sends everything to AI
 * 4. Prints a clear explanation with fix suggestions
 */
export async function explainCommand(options) {
    // Validate input
    if (!options.file && !options.error) {
        console.log(chalk.red("❌ Please provide a test file or error message"));
        console.log(chalk.gray("   Example: testai explain --file src/auth.test.ts --error 'Cannot read property of undefined'"));
        process.exit(1);
    }
    let prompt = "";
    // Case 1: User gave us a test file path
    if (options.file) {
        const spinner = ora("Reading test file and imports...").start();
        try {
            const context = readTestWithContext(options.file);
            spinner.succeed(`Read test file + ${context.importedFiles.length} imported file(s)`);
            // Show what we found
            if (context.importedFiles.length > 0) {
                console.log(chalk.gray("  📄 Also reading:"));
                context.importedFiles.forEach((f) => {
                    console.log(chalk.gray(`     • ${f.path}`));
                });
            }
            const errorMessage = options.error || "The test is failing. Analyze the code for issues.";
            prompt = buildContextPrompt(context, errorMessage);
        }
        catch (err) {
            spinner.fail(`Could not read file: ${err instanceof Error ? err.message : err}`);
            process.exit(1);
        }
    }
    else if (options.error) {
        // Case 2: User just pasted an error message (no file)
        prompt = `Analyze this test error and explain the root cause:\n\n${options.error}\n\nWhat is causing this error and how should it be fixed?`;
    }
    // Send to AI
    console.log("");
    const spinner = ora("Analyzing with AI...").start();
    const result = await askAI(prompt);
    if (!result.success) {
        spinner.fail("AI analysis failed");
        console.log(chalk.red(`\n${result.error}`));
        process.exit(1);
    }
    spinner.succeed("Analysis complete");
    // Print the result nicely
    console.log("\n" + chalk.cyan.bold("━".repeat(50)));
    console.log(chalk.cyan.bold("  🔍 AI Analysis"));
    console.log(chalk.cyan.bold("━".repeat(50)) + "\n");
    console.log(result.text);
    console.log("\n" + chalk.cyan.bold("━".repeat(50)) + "\n");
}
