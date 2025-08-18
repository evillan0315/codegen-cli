import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto p-4">
      <h1 className="text-6xl font-extrabold text-white mb-6 leading-tight">
        Unleash Your Creativity with{" "}
        <span className="text-indigo-400">AI-Powered Editing</span>
      </h1>
      <p className="text-xl text-gray-300 mb-8 max-w-2xl">
        Revolutionize your content creation with intelligent tools that assist,
        enhance, and inspire. From text generation to image manipulation, your
        creative process just got a powerful upgrade.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/editor"
          className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
        >
          Start Editing Now
        </Link>
        <a
          href="#"
          className="px-8 py-4 border border-indigo-500 text-indigo-300 text-lg font-semibold rounded-lg shadow-lg hover:bg-indigo-900 hover:border-indigo-400 transition-all duration-300 transform hover:scale-105"
        >
          Learn More
        </a>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
          <h3 className="text-2xl font-bold text-indigo-300 mb-3">
            Smart Text Assistance
          </h3>
          <p className="text-gray-400">
            Generate, rephrase, and perfect your writing with AI suggestions.
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
          <h3 className="text-2xl font-bold text-indigo-300 mb-3">
            Intelligent Image Tools
          </h3>
          <p className="text-gray-400">
            Enhance, transform, and create stunning visuals effortlessly.
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
          <h3 className="text-2xl font-bold text-indigo-300 mb-3">
            Streamlined Workflow
          </h3>
          <p className="text-gray-400">
            Boost your productivity with an intuitive and efficient interface.
          </p>
        </div>
      </div>
    </div>
  );
}
