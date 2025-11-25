import 'dotenv/config';
import { validateOpenAIConfig } from '../src/services/openai.service.ts';

/**
 * Script function type
 */
type ScriptFunction = () => Promise<void> | void;

/**
 * Script definition
 */
interface ScriptDefinition {
  name: string;
  description: string;
  run: ScriptFunction;
}

/**
 * Registry of all scripts
 */
const scriptRegistry = new Map<string, ScriptDefinition>();

/**
 * Register a script
 */
export function registerScript(name: string, description: string, scriptFn: ScriptFunction) {
  if (scriptRegistry.has(name)) {
    console.warn(`⚠️  Warning: Script "${name}" is already registered. Overwriting...`);
  }
  scriptRegistry.set(name, { name, description, run: scriptFn });
}

/**
 * Run a specific script by name
 */
async function runScript(scriptName: string) {
  const script = scriptRegistry.get(scriptName);
  if (!script) {
    console.error(`❌ Script "${scriptName}" not found`);
    console.log('\nAvailable scripts:');
    scriptRegistry.forEach((s) => {
      console.log(`  - ${s.name}: ${s.description}`);
    });
    process.exit(1);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Running: ${script.name}`);
  console.log(`Description: ${script.description}`);
  console.log('='.repeat(70) + '\n');

  try {
    await script.run();
    console.log(`\n✅ Script "${script.name}" completed successfully\n`);
  } catch (error) {
    console.error(`\n❌ Script "${script.name}" failed:`, error);
    process.exit(1);
  }
}

/**
 * Run all registered scripts
 */
async function runAllScripts() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Running All Scripts (${scriptRegistry.size} total)`);
  console.log('='.repeat(70));

  const scripts = Array.from(scriptRegistry.values());
  let completed = 0;
  let failed = 0;

  for (const script of scripts) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`[${completed + failed + 1}/${scripts.length}] ${script.name}`);
    console.log('─'.repeat(70));

    try {
      await script.run();
      console.log(`✅ ${script.name} - COMPLETED`);
      completed++;
    } catch (error) {
      console.error(`❌ ${script.name} - FAILED:`, error instanceof Error ? error.message : String(error));
      failed++;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Script Summary');
  console.log('='.repeat(70));
  console.log(`Total: ${scripts.length}`);
  console.log(`✅ Completed: ${completed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * List all available scripts
 */
function listScripts() {
  console.log('\n📋 Available Scripts:\n');
  scriptRegistry.forEach((script) => {
    console.log(`  • ${script.name}`);
    console.log(`    ${script.description}\n`);
  });
}

/**
 * Main entry point
 */
async function main() {
  // Import all script files to register them
  // This must happen before we try to use scriptRegistry
  await import('./script-extraction.ts');
  await import('./script-extraction-reader.ts');
  await import('./script-openai.ts');
  await import('./script-pii-emily-bank.ts');
  await import('./script-pii-scanner.ts');

  // Validate OpenAI config if needed (some scripts might not need it)
  try {
    validateOpenAIConfig();
  } catch (error) {
    // Continue anyway - some scripts might not need OpenAI
  }

  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'list') {
    listScripts();
    return;
  }

  if (args[0] === 'all') {
    await runAllScripts();
    return;
  }

  // Run specific script
  await runScript(args[0]);
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

