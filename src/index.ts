#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import { explainCommand } from "./commands/explain.js";
import { analyzeCommand } from "./commands/analyze.js";
import { runCommand } from "./commands/run.js";

console.log(chalk.cyan.bold("\n🧪 whyflaky — AI-powered test assistant\n"));

program
  .name("whyflaky")
  .description("AI assistant for test engineers")
  .version("0.1.0");

program
  .command("explain")
  .description("Explain why a test is failing")
  .option("-f, --file <path>", "Path to the test file")
  .option("-e, --error <message>", "Paste the error message directly")
  .action(explainCommand);

program
  .command("run")
  .description("Run tests and automatically analyze failures with AI")
  .option("-s, --spec <path>", "Run a specific spec file")
  .action(runCommand);

program
  .command("analyze")
  .description("Analyze test run output for patterns and flaky tests")
  .option("-o, --output <path>", "Path to test output file")
  .action(analyzeCommand);

program.parse();
