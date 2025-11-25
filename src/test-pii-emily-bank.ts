import 'dotenv/config.js';
import { scanFileForPII } from './services/pii-scanner.service.js';
import { validateOpenAIConfig } from './services/openai.service.js';
import path from 'path';

/**
 * Test the PII scanner workflow on Emily Chen's bank statement
 * Demonstrates chunking and PII extraction from a real financial document
 */
async function testPIIScannerWithEmilyBankStatement() {
  try {
    // Validate OpenAI configuration
    validateOpenAIConfig();

    // Use the emily_chen_bank_statement.txt sample file
    const testFile = path.resolve('/Users/mike/codes/pareto/samples/emily_chen_bank_statement.txt');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('        PII SCANNER - EMILY CHEN BANK STATEMENT TEST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📂 Test File: emily_chen_bank_statement.txt');
    console.log('📄 Document Type: Bank Statement');
    console.log('🎯 Objective: Extract all PII including names, addresses, account info, etc.');
    console.log('⚙️  Settings: 2000-char chunks with 30% overlap\n');

    console.log('⏳ Starting PII extraction...\n');

    // Run the PII scanner with:
    // - 2000 character chunks (good for financial documents)
    // - 30% overlap to preserve context at chunk boundaries
    const result = await scanFileForPII(testFile, 2000, 30);

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error during PII scanning:', error);
    process.exit(1);
  }
}

// Run the test
testPIIScannerWithEmilyBankStatement();

