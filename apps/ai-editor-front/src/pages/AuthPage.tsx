import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { redirectToGoogleAuth, redirectToGitHubAuth } from "../api/auth";

export function AuthPage() {
  // FIX: Add 'user' to the destructured properties from useAuth()
  const { login, isAuthenticated, isLoading, checkAuthStatus, user } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");
    const accessToken = params.get("accessToken");
    const userId = params.get("userId");
    const userEmail = params.get("userEmail");
    const userName = params.get("userName");
    const userImage = params.get("userImage");
    const userRole = params.get("userRole");
    const username = params.get("username"); // For GitHub username
    const errorMessage = params.get("error");

    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
    }

    if (action === "success" && accessToken && userId && userEmail) {
      // The backend sets an HTTP-only cookie, so we primarily rely on
      // the `/api/auth/me` endpoint to verify the session.
      // We'll call checkAuthStatus to re-fetch the user details from the backend
      // which will then update the AuthContext.
      setMessage("Login successful! Redirecting...");
      // Delay checkAuthStatus slightly to allow browser to process cookie
      setTimeout(() => {
        checkAuthStatus();
      }, 100); // Small delay
    } else if (isAuthenticated && !isLoading) {
      // Already authenticated and not loading, redirect to editor
      navigate("/editor", { replace: true });
    } else if (!action && !accessToken && !isLoading) {
      // No special action, not authenticated, not loading
      setMessage("Please log in to continue.");
    }
  }, [
    location.search,
    isAuthenticated,
    isLoading,
    navigate,
    login,
    checkAuthStatus,
  ]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Once authentication status is confirmed and user is logged in,
      // redirect to the editor page
      navigate("/editor", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white text-xl">
        <p>Loading authentication status...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto bg-gray-800 rounded-lg shadow-xl border border-gray-700">
      <h1 className="text-4xl font-bold text-white mb-6">
        {isAuthenticated ? "Welcome Back!" : "Log In to AI Editor"}
      </h1>

      {error && <p className="text-red-400 mb-4 text-lg">Error: {error}</p>}

      {message && <p className="text-indigo-300 mb-6 text-lg">{message}</p>}

      {!isAuthenticated && (
        <div className="flex flex-col space-y-4 w-full max-w-sm">
          <Button
            onClick={redirectToGoogleAuth}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
          >
            Login with Google
          </Button>
          <Button
            onClick={redirectToGitHubAuth}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 text-lg font-semibold"
          >
            Login with GitHub
          </Button>
          {/* Optionally, add local login/registration forms here */}
          <p className="text-gray-400 mt-4">
            Or{" "}
            <Link to="#" className="text-indigo-400 hover:underline">
              register with email
            </Link>
          </p>
        </div>
      )}

      {isAuthenticated && (
        <div className="mt-8">
          <p className="text-lg text-gray-200 mb-4">
            You are logged in as{" "}
            <span className="font-semibold text-indigo-300">
              {user?.name || user?.email || "User"}
            </span>
            .
          </p>
          <Link
            to="/editor"
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
          >
            Go to Editor
          </Link>
        </div>
      )}
    </div>
  );
}
