export function joinPaths(...paths: string[]): string {
  // Basic join for web paths. Not as robust as node's path.join across all OS.
  // Assumes forward slashes for internal consistency.
  return paths.filter(p => p !== '').join('/').replace(/\/\/+/g, '/');
}

export function getRelativePath(absolutePath: string, basePath: string): string {
  // Ensure paths use forward slashes for consistency
  const normalizedAbsolutePath = absolutePath.replace(/\\/g, '/');
  const normalizedBasePath = basePath.replace(/\\/g, '/');

  // If base path ends with a slash, remove it for consistent comparison
  const cleanBasePath = normalizedBasePath.endsWith('/') ? normalizedBasePath.slice(0, -1) : normalizedBasePath;
  const cleanAbsolutePath = normalizedAbsolutePath.endsWith('/') ? normalizedAbsolutePath.slice(0, -1) : normalizedAbsolutePath;

  // Check if the absolute path starts with the base path
  if (cleanAbsolutePath.startsWith(cleanBasePath)) {
    let relative = cleanAbsolutePath.substring(cleanBasePath.length);
    // Remove leading slash if it exists (e.g., '/src' becomes 'src')
    if (relative.startsWith('/')) {
      relative = relative.substring(1);
    }
    return relative === '' ? '.' : relative; // '.' for project root itself
  }
  return absolutePath; // Cannot make relative, return original or handle as an error
}
