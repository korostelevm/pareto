import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export interface DirectoryEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
}

/**
 * Reads a directory and returns all entries (files and directories) inside it
 * @param directoryPath - The path to the directory to read
 * @returns Promise resolving to an array of directory entries
 * @throws Error if the directory doesn't exist or cannot be read
 */
export async function readDirectory(directoryPath: string): Promise<DirectoryEntry[]> {
  try {
    const entries = await readdir(directoryPath);
    
    const entriesWithStats = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(directoryPath, entry);
        const stats = await stat(fullPath);
        
        return {
          name: entry,
          path: fullPath,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
        };
      })
    );
    
    return entriesWithStats;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read directory "${directoryPath}": ${error.message}`);
    }
    throw error;
  }
}

/**
 * Reads a directory and returns only files (excludes subdirectories)
 * @param directoryPath - The path to the directory to read
 * @returns Promise resolving to an array of file entries
 * @throws Error if the directory doesn't exist or cannot be read
 */
export async function readDirectoryFiles(directoryPath: string): Promise<DirectoryEntry[]> {
  const entries = await readDirectory(directoryPath);
  return entries.filter(entry => entry.isFile);
}

/**
 * Reads a directory and returns only subdirectories (excludes files)
 * @param directoryPath - The path to the directory to read
 * @returns Promise resolving to an array of directory entries
 * @throws Error if the directory doesn't exist or cannot be read
 */
export async function readDirectorySubdirectories(directoryPath: string): Promise<DirectoryEntry[]> {
  const entries = await readDirectory(directoryPath);
  return entries.filter(entry => entry.isDirectory);
}

