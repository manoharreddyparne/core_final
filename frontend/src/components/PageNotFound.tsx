import React from "react";
import { Link } from "react-router-dom";
import { Search, Home, ArrowLeft } from "lucide-react";

export const PageNotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900 font-sans p-6">
            <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-gray-50 border border-gray-100">
                        <Search className="w-16 h-16 text-gray-300" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-9xl font-black text-gray-100 leading-none">404</h1>
                    <h2 className="text-2xl font-bold tracking-tight">Oops! Page not found</h2>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">
                        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                    >
                        <Home className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>

                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">
                    Reference ID: {Math.random().toString(36).substring(7).toUpperCase()}
                </p>
            </div>
        </div>
    );
};
