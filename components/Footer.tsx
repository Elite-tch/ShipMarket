import React from "react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full border-t border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex space-x-6 mb-4 md:mb-0">
                        <Link href="/" className="hover:text-brand transition-colors">
                            Home
                        </Link>
                        <Link href="/about" className="hover:text-brand transition-colors">
                            About
                        </Link>
                        <Link href="/terms" className="hover:text-brand transition-colors">
                            Terms
                        </Link>
                    </div>
                    <div>
                        &copy; {new Date().getFullYear()} ShipQuest. Built for Solana.
                    </div>
                </div>
            </div>
        </footer>
    );
}
