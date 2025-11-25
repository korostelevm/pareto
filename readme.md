# Pareto

A TypeScript application for extracting and analyzing Personally Identifiable Information (PII) from documents using OpenAI's GPT models.

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

## Project Structure

```
pareto/
├── scripts/              # Interactive exploration scripts
│   ├── runner.ts        # Unified script runner
│   ├── script-*.ts      # Individual script files
│   └── README.md        # Detailed script documentation
├── src/                  # Application source code
│   ├── services/        # Core services
│   │   ├── directory.service.ts
│   │   ├── extraction.service.ts
│   │   ├── extraction-reader.service.ts
│   │   ├── file.service.ts
│   │   ├── openai.service.ts
│   │   └── pii-scanner.service.ts
│   ├── utils/           # Utilities and schemas
│   │   ├── individual.schema.json
│   │   ├── pay-stub.schema.json
│   │   └── schema.util.ts
│   └── index.ts         # Main application entry point
├── data/                # Generated extraction results
├── samples/             # Sample documents for testing
├── package.json
└── README.md
```

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
