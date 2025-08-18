/**
 * Represents a simplified user object for frontend consumption.
 * This should align with the data returned by the backend's /api/auth/me endpoint.
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: "USER" | "ADMIN" | "MANAGER" | "SUPERADMIN"; // Matching NestJS Role enum
  image?: string;
  phone_number?: string;
  username?: string;
  emailVerified?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Defines the shape of the authentication context.
 */
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}
