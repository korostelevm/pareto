# Running PII Scanner Tests

## Prerequisites

1. **OpenAI API Key**: Ensure your `.env` file in the project root contains:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

2. **Node.js**: Project requires Node.js v25.0.0+ (see `package.json`)

## Running Tests

Use the Node.js loader approach with tsx to avoid npm permission issues:

```bash
cd /Users/mike/codes/pareto
node --import tsx src/test-pii-[test-name].ts
```

Replace `[test-name]` with your test file name.

## Troubleshooting

### Problem: "Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable"

**Solution**: Ensure `.env` file exists and contains `OPENAI_API_KEY`. The test files automatically load it via `dotenv/config.js`.

### Problem: "Unknown file extension .ts"

**Solution**: Must use `--import tsx` flag, not `--loader`. Use the commands above.

### Problem: npm permission error on @sigstore/verify

**Solution**: Avoid using npm/npx. Use the direct Node.js command with tsx instead.

### Problem: Schema validation errors from OpenAI

**Solution**: 
- Ensure all fields in the Zod schema are either required or have defaults
- The extraction service converts Zod → JSON Schema automatically
- Enum fields must have proper type definitions

## What Happens When You Run

1. **File Loading**: Reads the sample document
2. **Chunking**: Splits file into overlapping chunks (30% overlap preserves context)
3. **Processing**: Sends each chunk to OpenAI's GPT-4o model for PII extraction
4. **Deduplication**: Combines results across chunks, removing duplicates
5. **Output**: Returns JSON with PII findings

## Output Format

The test outputs clean JSON with this structure:

```json
{
  "file": "/path/to/file.txt",
  "chunks_scanned": 2,
  "total_pii_found": 9,
  "results": [...],
  "combined_pii": [
    {
      "value": "actual PII value",
      "pii_type": "Type determined by AI",
      "confidence": "high|medium|low",
      "context": "where it was found"
    }
  ]
}
```

## Testing Different Files

To test a different sample file, edit the test file and change the file path to point to your sample in `/samples/`.

## Key Points

✅ **dotenv loads automatically** - `import 'dotenv/config.js'` at top of test files
✅ **Node --import tsx** - Proper way to load TypeScript in this ESM setup
✅ **No npm permission issues** - Bypass npm, use Node directly
✅ **JSON output only** - Clean, parseable results
✅ **Chunking + overlap** - Handles large files efficiently while preserving context
✅ **Confidence scores** - AI-determined confidence levels for each finding

