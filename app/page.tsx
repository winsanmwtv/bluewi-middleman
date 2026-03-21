'use client';

import { useEffect, useState } from 'react';

export default function Home() {
    const [logData, setLogData] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        const fetchLog = async () => {
            try {
                const res = await fetch('/api/proxy');
                const json = await res.json();

                // Format the JSON nicely with 2 spaces of indentation
                setLogData(JSON.stringify(json, null, 2));
            } catch (err) {
                setLogData(JSON.stringify({ error: 'Failed to load log data.' }, null, 2));
            }
        };

        fetchLog();
    }, []);

    // Function to handle copying to clipboard
    const handleCopy = () => {
        if (logData) {
            navigator.clipboard.writeText(logData);
            setCopied(true);

            // Reset the button text after 2 seconds
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        }
    };

    // Show spinning loader while fetching
    if (logData === null) {
        return (
            <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-600 border-t-green-400 rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4 font-mono text-sm">Fetching logs...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-950 p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl relative">
                {/* Header and Copy Button */}
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-white font-mono text-xl">Iciwi JSON Logs</h1>
                    <button
                        onClick={handleCopy}
                        className={`px-4 py-2 rounded font-mono text-sm transition-colors ${
                            copied
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        {copied ? 'Copied!' : 'Copy JSON'}
                    </button>
                </div>

                {/* JSON Display Box */}
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 shadow-xl overflow-hidden">
                    <pre className="text-green-400 font-mono text-sm overflow-auto max-h-[75vh]">
                        {logData}
                    </pre>
                </div>
            </div>
        </main>
    );
}