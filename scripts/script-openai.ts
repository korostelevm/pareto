import { openai, validateOpenAIConfig } from '../src/services/openai.service.ts';
import { registerScript } from './runner.ts';

/**
 * Demonstrate OpenAI API connection and basic functionality
 */
async function runOpenAIScript() {
  // Validate that OpenAI API key is configured
  validateOpenAIConfig();
  console.log('✓ OpenAI API key is configured\n');

  console.log('Sending "Hello, world!" to OpenAI...\n');

  // Make a simple completion request
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: 'Say "Hello, world!" and nothing else.',
      },
    ],
    max_tokens: 50,
  });

  const response = completion.choices[0]?.message?.content;

  if (response) {
    console.log('Response from OpenAI:');
    console.log(response);
    console.log('\n✓ OpenAI integration is working correctly.');
  } else {
    throw new Error('No response received from OpenAI');
  }
}

registerScript(
  'openai',
  'Demonstrate OpenAI API connection and basic functionality',
  runOpenAIScript
);

