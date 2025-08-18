import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  type PropsWithChildren,
} from "react";
import { getProfile, logout as apiLogout } from "../api/auth";
import type { User, AuthContextType } from "../types/auth";

// Create the Auth Context with a default null value
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Function to set user data (e.g., after login)
  const login = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  // Function to clear user data (e.g., after logout)
  const logout = useCallback(async () => {
    try {
      await apiLogout();
      setUser(null);
    } catch (error) {
      console.error("Failed to log out:", error);
      // Optionally, show an error message to the user
    }
  }, []);

  // Function to check authentication status on mount or when needed
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await getProfile();
      setUser(userData);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth status on initial mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const contextValue = React.useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      checkAuthStatus,
    }),
    [user, isAuthenticated, isLoading, login, logout, checkAuthStatus],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
