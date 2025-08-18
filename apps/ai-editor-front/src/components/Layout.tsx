import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Layout({ children }: PropsWithChildren) {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <header className="py-4 px-6 border-b border-gray-700 app-header">
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            AI Editor
          </Link>
          <ul className="flex space-x-6 items-center">
            <li>
              <Link
                to="/"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/editor"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Editor
              </Link>
            </li>
            {!isLoading &&
              (isAuthenticated ? (
                <>
                  <li className="text-gray-300">
                    Welcome, {user?.name || user?.email}!
                  </li>
                  <li>
                    <button
                      onClick={logout}
                      className="text-red-400 hover:text-red-300 transition-colors py-1 px-3 rounded border border-red-500 hover:bg-red-900"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    to="/login"
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                  >
                    Login
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center p-8">
        {children}
      </main>
      <footer className="py-4 px-6 border-t border-gray-700 text-center text-gray-400 text-sm app-footer">
        © {new Date().getFullYear()} AI Editor. All rights reserved.
      </footer>
    </div>
  );
}
