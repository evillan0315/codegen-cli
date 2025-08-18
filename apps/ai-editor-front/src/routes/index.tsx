import { Routes, Route, Link, Outlet, Navigate } from "react-router-dom";
import { LandingPage } from "../pages/LandingPage";
import  { AiEditorPage }  from "../pages/AiEditorPage";
import { AuthPage } from "../pages/AuthPage"; // New: Import AuthPage
import { Layout } from "../components/Layout";
import { useAuth } from "../hooks/useAuth"; // New: Import useAuth

// New: ProtectedRoute component
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Optionally show a loading spinner or null while checking auth status
    return (
      <div className="flex flex-col items-center justify-center h-full text-white text-xl">
        <p>Checking authentication...</p>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />{" "}
        {/* New: AuthPage route */}
        {/* Protected Route for AiEditorPage */}
        <Route element={<ProtectedRoute />}>
          <Route path="/editor" element={<AiEditorPage />} />
        </Route>
        {/* Add more routes here as needed */}
        <Route path="*" element={<NoMatch />} />
      </Routes>
    </Layout>
  );
}

function NoMatch() {
  return (
    <div className="text-center p-8">
      <h2 className="text-4xl font-bold text-red-400 mb-4">
        Oops! Nothing to see here.
      </h2>
      <p className="text-lg text-gray-300 mb-8">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
      >
        Go to Home
      </Link>
    </div>
  );
}
