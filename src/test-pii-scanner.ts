import { scanFileForPII } from './services/pii-scanner.service.js';
import { validateOpenAIConfig } from './services/openai.service.js';

/**
 * Test the PII scanner workflow on a single file
 */
async function testPIIScanner() {
  try {
    // Validate OpenAI configuration
    validateOpenAIConfig();

    // Test file path - change this to test different samples
    const testFile = '/Users/mike/codes/pareto/samples/james_martinez_insurance_card.txt';

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('        PII SCANNER WORKFLOW TEST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Run the PII scanner with:
    // - 2000 character chunks (good for detailed document analysis)
    // - 30% overlap for context preservation
    const result = await scanFileForPII(testFile, 2000, 30);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('        RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📄 File: ${result.file}`);
    console.log(`📦 Chunks Scanned: ${result.chunks_scanned}`);
    console.log(`🔍 Total PII Found: ${result.total_pii_found}\n`);

    if (result.combined_pii.length > 0) {
      console.log('🚨 Detected PII Candidates:\n');

      // Group by PII type
      const piiByType = new Map<string, typeof result.combined_pii>();
      result.combined_pii.forEach((pii) => {
        if (!piiByType.has(pii.pii_type)) {
          piiByType.set(pii.pii_type, []);
        }
        piiByType.get(pii.pii_type)!.push(pii);
      });

      // Display grouped results
      piiByType.forEach((candidates, piiType) => {
        console.log(`\n📋 ${piiType.toUpperCase()}`);
        console.log('─'.repeat(60));
        candidates.forEach((candidate, index) => {
          console.log(`  ${index + 1}. ${candidate.value}`);
          console.log(`     Confidence: ${candidate.confidence}`);
          if (candidate.context) {
            console.log(`     Context: ${candidate.context.substring(0, 100)}...`);
          }
        });
      });
    } else {
      console.log('✅ No PII detected in the document.');
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error during PII scanning:', error);
    process.exit(1);
  }
}

// Run the test
testPIIScanner();

