import type { User } from "../types/auth";

const API_BASE_URL = "/api"; // Assuming backend is served from the same origin, or configure with process.env.VITE_API_BASE_URL

interface LoginResponse {
  accessToken: string;
  user: User;
}

/**
 * Fetches the currently authenticated user's profile.
 * @returns {Promise<User | null>} The user object if authenticated, otherwise null.
 */
export async function getProfile(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`);
    if (response.ok) {
      const userData: User = await response.json();
      return userData;
    } else if (response.status === 401) {
      // Not authenticated, which is expected if no cookie is present
      return null;
    }
    throw new Error(`Failed to fetch profile: ${response.statusText}`);
  } catch (error) {
    console.error("Error fetching profile:", error);
    // If there's a network error or other issue, assume not authenticated
    return null;
  }
}

/**
 * Logs out the current user.
 * @returns {Promise<void>}
 */
export async function logout(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Logout failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error during logout:", error);
    throw error; // Re-throw to allow calling component to handle
  }
}

/**
 * Redirects to the Google OAuth login endpoint.
 */
export function redirectToGoogleAuth(): void {
  window.location.href = `${API_BASE_URL}/auth/google?cli_port=5173`;
}

/**
 * Redirects to the GitHub OAuth login endpoint.
 */
export function redirectToGitHubAuth(): void {
  window.location.href = `${API_BASE_URL}/auth/github`;
}

// Placeholder for direct email/password login if needed in the future
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Login failed");
  }
  return response.json();
}

// Placeholder for direct email/password registration if needed in the future
export async function registerWithCredentials(data: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Registration failed");
  }
  return response.json();
}
