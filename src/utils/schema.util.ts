import { z } from 'zod';
import { readFileSync } from 'fs';

interface JsonSchemaProperty {
  type: string;
  description?: string;
}

interface JsonSchema {
  type: 'object';
  properties: {
    [key: string]: JsonSchemaProperty;
  };
  required?: string[];
}

/**
 * Converts a JSON Schema property type to a Zod schema
 */
function jsonTypeToZod(property: JsonSchemaProperty): z.ZodTypeAny {
  switch (property.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      return z.array(z.any());
    default:
      return z.any();
  }
}

/**
 * Creates a Zod schema from a JSON schema file
 * @param schemaPath - Path to the JSON schema file
 * @returns A Zod schema object
 */
export function loadSchemaFromJsonFile(schemaPath: string): z.ZodObject<any> {
  try {
    const fileContent = readFileSync(schemaPath, 'utf-8');
    const jsonSchema: JsonSchema = JSON.parse(fileContent);
    
    if (jsonSchema.type !== 'object') {
      throw new Error('JSON schema must define an object type');
    }
    
    if (!jsonSchema.properties) {
      throw new Error('JSON schema must have properties defined');
    }
    
    // Build Zod schema object from JSON schema properties
    const zodShape: Record<string, z.ZodTypeAny> = {};
    
    for (const [key, property] of Object.entries(jsonSchema.properties)) {
      let zodType = jsonTypeToZod(property);
      
      // Make optional if not in required array
      const isRequired = jsonSchema.required?.includes(key) ?? true;
      if (!isRequired) {
        zodType = zodType.optional();
      }
      
      zodShape[key] = zodType;
    }
    
    return z.object(zodShape);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in schema file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Loads and validates data against a schema from a JSON schema file
 * @param schemaPath - Path to the JSON schema file
 * @param dataPath - Path to the data JSON file to validate
 * @returns Parsed and validated data
 */
export function validateDataWithSchema(schemaPath: string, dataPath: string): any {
  const schema = loadSchemaFromJsonFile(schemaPath);
  
  try {
    const fileContent = readFileSync(dataPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    return schema.parse(jsonData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Schema validation failed: ${error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

