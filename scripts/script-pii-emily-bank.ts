import { scanFileForPII } from '../src/services/pii-scanner.service.ts';
import { validateOpenAIConfig } from '../src/services/openai.service.ts';
import path from 'path';
import { registerScript } from './runner.ts';

/**
 * Demonstrate PII scanner workflow on Emily Chen's bank statement
 * Shows chunking and PII extraction from a real financial document
 */
async function runPIIEmilyBankScript() {
  // Validate OpenAI configuration
  validateOpenAIConfig();

  // Use the emily_chen_bank_statement.txt sample file
  const testFile = path.resolve(process.cwd(), 'samples', 'emily_chen_bank_statement.txt');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        PII SCANNER - EMILY CHEN BANK STATEMENT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📂 File: emily_chen_bank_statement.txt');
  console.log('📄 Document Type: Bank Statement');
  console.log('🎯 Objective: Extract all PII including names, addresses, account info, etc.');
  console.log('⚙️  Settings: 2000-char chunks with 30% overlap\n');

  console.log('⏳ Starting PII extraction...\n');

  // Run the PII scanner with:
  // - 2000 character chunks (good for financial documents)
  // - 30% overlap to preserve context at chunk boundaries
  const result = await scanFileForPII(testFile, 2000, 30);

  console.log(JSON.stringify(result, null, 2));
}

registerScript(
  'pii-emily-bank',
  'Demonstrate PII scanner on Emily Chen bank statement',
  runPIIEmilyBankScript
);

