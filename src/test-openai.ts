import 'dotenv/config';
import { openai, validateOpenAIConfig } from './services/openai.service.js';

async function testOpenAI() {
  try {
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
      console.log('\n✓ Test passed! OpenAI integration is working.');
    } else {
      console.error('✗ No response received from OpenAI');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Test failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testOpenAI();

