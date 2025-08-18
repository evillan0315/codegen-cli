export async function createFile(filePath: string, overwrite: boolean, content: string): Promise<void> {
  try {
    const response = await fetch('/api/file/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath, overwrite, content }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create file '${filePath}': ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    console.error(`Error creating file '${filePath}':`, error);
    throw error;
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    const response = await fetch('/api/file/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath, content }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to write file '${filePath}': ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    console.error(`Error writing file '${filePath}':`, error);
    throw error;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    const response = await fetch('/api/file/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to delete file '${filePath}': ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    console.error(`Error deleting file '${filePath}':`, error);
    throw error;
  }
}

export async function openDirectoryPicker(): Promise<string | null> {
  try {
    const response = await fetch('/api/file/select-directory'); // Assume this endpoint exists on backend
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to open directory picker: ${errorData.message || response.statusText}`);
    }
    const data = await response.json();
    // The backend should return { path: "/absolute/path/to/selected/directory" }
    if (data && typeof data.path === 'string') {
      return data.path;
    } else {
      console.error("Backend response for directory picker was not as expected:", data);
      return null;
    }
  } catch (error) {
    console.error("Error opening directory picker:", error);
    throw error; // Re-throw to be handled by the calling component
  }
}
