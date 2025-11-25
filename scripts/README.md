# Scripts

Interactive scripts for exploring and demonstrating module functionality. These are not automated tests, but rather tools for experimenting with each module in isolation.

Scripts are located at the root level (`scripts/`) following Node.js best practices, separate from application source code (`src/`).

## Running Scripts

### List all available scripts
```bash
npm run script:list
# or
npm run script list
```

### Run all scripts
```bash
npm run script:all
# or
npm run script all
```

### Run a specific script
```bash
npm run script:extraction
npm run script:extraction-reader
npm run script:openai
npm run script:pii-scanner
npm run script:pii-emily-bank
```

### Direct runner usage
```bash
npx tsx scripts/runner.ts <script-name>
npx tsx scripts/runner.ts list
npx tsx scripts/runner.ts all
```

## Available Scripts

- **extraction** - Demonstrate schema extraction from text using OpenAI
- **extraction-reader** - Aggregate PII types and contexts from all extraction result files
- **openai** - Demonstrate OpenAI API connection and basic functionality
- **pii-scanner** - Demonstrate PII scanner workflow on a sample file
- **pii-emily-bank** - Demonstrate PII scanner on Emily Chen bank statement

## Script Structure

All scripts:
- Are automatically registered when imported
- Don't need to handle environment setup (dotenv/config is handled by the runner)
- Export a script function that gets registered with `registerScript()`
- Use relative imports from the `scripts/` directory

## Adding a New Script

1. Create a new file in `scripts/` (e.g., `script-my-feature.ts`)
2. Import `registerScript` from `./runner.js`
3. Import services from `../src/` (e.g., `../src/services/my-service.js`)
4. Write your script function
5. Register it:
   ```typescript
   import { registerScript } from './runner.ts';
   import { myService } from '../src/services/my-service.ts';
   
   async function runMyFeatureScript() {
     // Your script code here
   }
   
   registerScript(
     'my-feature',
     'Description of what this script demonstrates',
     runMyFeatureScript
   );
   ```
6. Import the script file in `runner.ts`:
   ```typescript
   await import('./script-my-feature.ts');
   ```

The script will automatically be available via the runner!

