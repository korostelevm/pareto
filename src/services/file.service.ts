import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';

export interface FileContent {
  path: string;
  content: string | Buffer;
  size: number;
  encoding?: BufferEncoding;
}

/**
 * Reads a file's contents into memory as a string
 * @param filePath - The path to the file to read
 * @param encoding - The encoding to use (default: 'utf-8')
 * @returns Promise resolving to file content with metadata
 * @throws Error if the file doesn't exist or cannot be read
 */
export async function readFileContent(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<FileContent> {
  try {
    const [content, stats] = await Promise.all([
      readFile(filePath, encoding),
      stat(filePath),
    ]);

    return {
      path: filePath,
      content,
      size: stats.size,
      encoding,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read file "${filePath}": ${error.message}`);
    }
    throw error;
  }
}

/**
 * Reads a file's contents into memory as a Buffer (binary)
 * @param filePath - The path to the file to read
 * @returns Promise resolving to file content with metadata
 * @throws Error if the file doesn't exist or cannot be read
 */
export async function readFileAsBuffer(filePath: string): Promise<FileContent> {
  try {
    const [content, stats] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ]);

    return {
      path: filePath,
      content,
      size: stats.size,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read file "${filePath}": ${error.message}`);
    }
    throw error;
  }
}

/**
 * Reads multiple files' contents into memory
 * @param filePaths - Array of file paths to read
 * @param encoding - The encoding to use (default: 'utf-8')
 * @returns Promise resolving to an array of file contents
 * @throws Error if any file doesn't exist or cannot be read
 */
export async function readMultipleFiles(
  filePaths: string[],
  encoding: BufferEncoding = 'utf-8'
): Promise<FileContent[]> {
  return Promise.all(filePaths.map(path => readFileContent(path, encoding)));
}

export interface Chunk {
  index: number;
  content: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Chunks a file content into overlapping chunks with specified overlap percentage
 * @param content - The file content to chunk
 * @param chunkSize - Size of each chunk in characters (default: 1000)
 * @param overlapPercentage - Percentage of overlap between chunks (default: 30)
 * @returns Array of overlapping chunks with metadata
 */
export function chunkFileContent(
  content: string,
  chunkSize: number = 1000,
  overlapPercentage: number = 30
): Chunk[] {
  if (chunkSize <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }

  if (overlapPercentage < 0 || overlapPercentage >= 100) {
    throw new Error('Overlap percentage must be between 0 and 100');
  }

  // Calculate overlap size in characters
  const overlapSize = Math.floor((chunkSize * overlapPercentage) / 100);
  // Step size is chunk size minus overlap
  const stepSize = chunkSize - overlapSize;

  const chunks: Chunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < content.length) {
    const endIndex = Math.min(startIndex + chunkSize, content.length);
    const chunkContent = content.substring(startIndex, endIndex);

    chunks.push({
      index: chunkIndex,
      content: chunkContent,
      startIndex,
      endIndex,
    });

    // If we've reached the end, break
    if (endIndex === content.length) {
      break;
    }

    // Move to next chunk start position
    startIndex += stepSize;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Chunks a file from disk into overlapping chunks with specified overlap percentage
 * @param filePath - Path to the file to chunk
 * @param chunkSize - Size of each chunk in characters (default: 1000)
 * @param overlapPercentage - Percentage of overlap between chunks (default: 30)
 * @param encoding - File encoding (default: 'utf-8')
 * @returns Promise resolving to array of overlapping chunks with metadata
 */
export async function chunkFileFromDisk(
  filePath: string,
  chunkSize: number = 1000,
  overlapPercentage: number = 30,
  encoding: BufferEncoding = 'utf-8'
): Promise<Chunk[]> {
  const fileContent = await readFileContent(filePath, encoding);
  const contentStr = typeof fileContent.content === 'string' 
    ? fileContent.content 
    : fileContent.content.toString(encoding);
  
  return chunkFileContent(contentStr, chunkSize, overlapPercentage);
}

