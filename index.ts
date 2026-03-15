#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import { explainCommand } from "./commands/explain.js";
import { analyzeCommand } from "./commands/analyze.js";

console.log(chalk.cyan.bold("\n🧪 testai — AI-powered test assistant\n"));

program
  .name("testai")
  .description("AI assistant for test engineers")
  .version("0.1.0");

// Command 1: Explain a test failure
// Usage: testai explain --file path/to/test.spec.ts
program
  .command("explain")
  .description("Explain why a test is failing")
  .option("-f, --file <path>", "Path to the test file")
  .option("-e, --error <message>", "Paste the error message directly")
  .action(explainCommand);

// Command 2: Analyze test output (coming soon)
// Usage: testai analyze --output test-results.txt
program
  .command("analyze")
  .description("Analyze test run output for patterns and flaky tests")
  .option("-o, --output <path>", "Path to test output file")
  .action(analyzeCommand);

program.parse();
