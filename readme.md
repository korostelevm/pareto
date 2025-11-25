# Pareto

A TypeScript application for extracting and analyzing Personally Identifiable Information (PII) from documents using OpenAI's GPT models.

## Pipeline (now & next)

- **Current**: Extract PII into a common JSON shape (currently modeled by `src/utils/individual.schema.json` as a local stand‑in), aggregate results across many files, and use value-based grouping to see where type names disagree or overlap.
- **Planned**: Let the canonical schema evolve over time in an external schema store, and drive a PII-obfuscation step that builds per‑individual profiles and replaces known canonical fields with realistic fakes while masking unknown types with `*****` until they’re mapped.
- **Why**: This keeps the system conservative and safe (never guessing on unknown types) while using real data (plus optional AI assistance on ambiguous clusters) to gradually learn a stable, reusable PII schema for extraction and obfuscation.

### Step-by-step pipeline & scripts

1. **Extract PII for all sample documents (current)**
   - **What**: Run the end-to-end PII scanner over everything in `samples/` and write a single JSON result file into `data/`.
   - **Script**:
     ```bash
     npm start extract-pii
     ```

2. **Explore aggregated PII types and contexts (current)**
   - **What**: Read one or more extraction result files from `data/` and see which PII types and contexts were found.
   - **Script**:
     ```bash
     npm run script:extraction-reader
     ```

3. **Analyze ambiguous PII and approximate a canonical schema (current / assisted)**
   - **What**: Group PII by value and type, detect naming conflicts, and build an approximate canonical schema by merging types that share values; for anything still ambiguous after value-based grouping, we can layer AI on top (e.g., an LLM) to recommend merges or canonical labels.
   - **Script**:
     ```bash
     npm run script:pii-resolution
     ```

4. **Evolve the canonical schema and drive obfuscation (planned)**
   - **What**: Sync the learned canonical types into a dedicated schema service (with `src/utils/individual.schema.json` acting today as a mock schema), and use that service to power a PII-obfuscation step that swaps real identities for consistent fake profiles, while masking unknown types with `*****` until they’ve been mapped and can be safely replaced.
   - **Scripts**: to be added as the schema‑evolution, AI‑assisted disambiguation, and obfuscation features are implemented.

## Features

- **PII Extraction**: Scan documents for personally identifiable information using AI
- **Structured Data Extraction**: Extract structured data from unstructured text using Zod schemas
- **File Processing**: Chunk large files with configurable overlap for context preservation
- **Data Aggregation**: Analyze and aggregate PII extraction results across multiple files
- **Type-Safe**: Built with TypeScript and Zod for type safety and validation

## Prerequisites

- **Node.js**: v25.0.0 or higher
- **OpenAI API Key**: Required for extraction and PII scanning features

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your-api-key-here
   ```

## Usage

### Main Application

The main application provides a PII extraction workflow:

```bash
# Run PII extraction workflow (processes 3 sample files)
npm start extract-pii

# Or run without arguments to see directory reading functionality
npm start <directory-path>
```

The workflow:
- Reads sample files from the `samples/` directory
- Extracts PII using the PII scanner service
- Saves results to `data/pii-extraction-results-{timestamp}.json`

### Scripts

Interactive scripts for exploring and demonstrating module functionality. These are not automated tests, but rather tools for experimenting with each module in isolation.

Scripts are located at the root level (`scripts/`) following Node.js best practices, separate from application source code (`src/`).

#### List all available scripts
```bash
npm run script:list
# or
npm run script list
```

#### Run all scripts
```bash
npm run script:all
# or
npm run script all
```

#### Run a specific script
```bash
npm run script:extraction
npm run script:extraction-reader
npm run script:openai
npm run script:pii-scanner
npm run script:pii-emily-bank
```

#### Direct runner usage
```bash
npx tsx scripts/runner.ts <script-name>
npx tsx scripts/runner.ts list
npx tsx scripts/runner.ts all
```

#### Available Scripts

- **extraction** - Demonstrate schema extraction from text using OpenAI
- **extraction-reader** - Aggregate PII types and contexts from all extraction result files
- **openai** - Demonstrate OpenAI API connection and basic functionality
- **pii-scanner** - Demonstrate PII scanner workflow on a sample file
- **pii-emily-bank** - Demonstrate PII scanner on Emily Chen bank statement

## Services

### Directory Service
- Read directories and filter files/subdirectories
- Get file metadata and statistics

### File Service
- Read files as strings or buffers
- Chunk large files with configurable overlap
- Process multiple files in parallel

### OpenAI Service
- Initialize OpenAI client
- Validate API key configuration

### Extraction Service
- Extract structured data from text using Zod schemas
- Convert Zod schemas to JSON Schema for OpenAI
- Validate extracted data against schemas

### PII Scanner Service
- Scan files for personally identifiable information
- Chunk files with overlap for context preservation
- Deduplicate PII findings across chunks
- Return results with confidence levels

### Extraction Reader Service
- Load and validate extraction result files
- Query and filter PII candidates
- Aggregate PII types and contexts
- Generate statistics and reports

## Development

### Type Checking
```bash
npm run type-check
```

### Adding a New Script

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

## License

ISC
