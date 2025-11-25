import { openai } from './openai.service.ts';
import { z } from 'zod';
import { ZodSchema } from 'zod';

/**
 * Converts a Zod schema to a JSON Schema format for OpenAI
 */
function zodToJsonSchema(zodSchema: ZodSchema): any {
  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      const jsonSchema = zodTypeToJsonSchema(value);
      properties[key] = jsonSchema.schema;
      
      if (jsonSchema.required) {
        required.push(key);
      }
    }
    
    // OpenAI strict mode requires all properties to be listed in required
    // if they don't have other ways to indicate optionality
    const allKeys = Object.keys(properties);
    
    return {
      type: 'object',
      properties,
      required: allKeys.length > 0 ? allKeys : [],
      additionalProperties: false,
    };
  }
  
  throw new Error('Schema must be a ZodObject');
}

/**
 * Converts a Zod type to JSON Schema
 */
function zodTypeToJsonSchema(zodType: z.ZodTypeAny): { schema: any; required: boolean } {
  // Handle optional
  if (zodType instanceof z.ZodOptional) {
    const inner = zodTypeToJsonSchema(zodType.unwrap() as z.ZodTypeAny);
    return { schema: { ...inner.schema }, required: false };
  }
  
  // Handle nullable
  if (zodType instanceof z.ZodNullable) {
    const inner = zodTypeToJsonSchema(zodType.unwrap() as z.ZodTypeAny);
    return { schema: { ...inner.schema, nullable: true }, required: inner.required };
  }
  
  // Handle string
  if (zodType instanceof z.ZodString) {
    return { schema: { type: 'string' }, required: true };
  }
  
  // Handle number
  if (zodType instanceof z.ZodNumber) {
    return { schema: { type: 'number' }, required: true };
  }
  
  // Handle boolean
  if (zodType instanceof z.ZodBoolean) {
    return { schema: { type: 'boolean' }, required: true };
  }
  
  // Handle enum
  if (zodType instanceof z.ZodEnum) {
    const values = (zodType as any).options;
    return { schema: { type: 'string', enum: values }, required: true };
  }
  
  // Handle array
  if (zodType instanceof z.ZodArray) {
    const inner = zodTypeToJsonSchema(zodType.element as z.ZodTypeAny);
    return { schema: { type: 'array', items: inner.schema }, required: true };
  }
  
  // Handle object (nested)
  if (zodType instanceof z.ZodObject) {
    const shape = zodType.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      const jsonSchema = zodTypeToJsonSchema(value);
      properties[key] = jsonSchema.schema;
      
      if (jsonSchema.required) {
        required.push(key);
      }
    }
    
    // OpenAI strict mode requires all properties to be listed in required
    // if they don't have other ways to indicate optionality
    const allKeys = Object.keys(properties);
    
    return {
      schema: {
        type: 'object',
        properties,
        required: allKeys.length > 0 ? allKeys : [],
        additionalProperties: false,
      },
      required: true,
    };
  }
  
  // Default to any
  return { schema: {}, required: true };
}

/**
 * Extracts structured data from text using OpenAI based on a Zod schema
 * @param prompt - Instructions for what to extract
 * @param content - The text content to extract from
 * @param schema - Zod schema defining the expected structure
 * @returns Extracted and validated data matching the schema
 */
export async function extractSchemaFromText<T>(
  prompt: string,
  content: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    // Convert Zod schema to JSON Schema for OpenAI
    const jsonSchema = zodToJsonSchema(schema);
    
    // Create the full prompt with content
    const fullPrompt = `${prompt}\n\nText to extract from:\n${content}`;
    
    // Call OpenAI with structured output
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'extracted_data',
          strict: true,
          schema: jsonSchema,
        },
      },
    });
    
    const extractedData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate against Zod schema
    return schema.parse(extractedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Schema validation failed: ${error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
}

