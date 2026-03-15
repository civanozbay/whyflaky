# 🧪 testai

AI-powered CLI tool for test engineers. Explains test failures, finds flaky tests, and suggests fixes.

---

## Setup (One-time)

### 1. Install dependencies
```bash
npm install
```

### 2. Install Ollama (the free local AI)
Download from: https://ollama.com

### 3. Start Ollama and pull the model
```bash
ollama serve          # Start the AI server (keep this running)
ollama pull codellama # Download the code-focused model (~4GB)
```

### 4. Build the project
```bash
npm run build
```

---

## Usage

### Explain a failing test (with file)
```bash
# Just point at your test file
npx tsx src/index.ts explain --file src/checkout.test.ts

# Also provide the error message for better analysis
npx tsx src/index.ts explain --file src/checkout.test.ts --error "TypeError: Cannot read properties of undefined"
```

### Explain from error message only
```bash
npx tsx src/index.ts explain --error "Expected 200 but received 404 at POST /api/checkout"
```

---

## Project Structure

```
src/
├── index.ts              # CLI entry point, command definitions
├── commands/
│   ├── explain.ts        # "testai explain" command
│   └── analyze.ts        # "testai analyze" command (coming soon)
├── ai/
│   └── client.ts         # Ollama AI integration
└── utils/
    └── fileReader.ts     # Reads test files + their imports
```

---

## Roadmap

- [x] `explain` — Explain why a test is failing
- [ ] `analyze` — Analyze test output, find flaky tests
- [ ] `generate` — Auto-generate test cases
- [ ] `coverage` — Suggest missing test coverage
- [ ] Support for Claude API / OpenAI (optional, user brings own key)
# whyflaky
