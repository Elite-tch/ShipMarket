import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl py-20">
        <div className="text-[10px] font-black text-brand uppercase tracking-[0.4em] mb-6 opacity-70">Powered by $SHIP</div>
        <h1 className="text-6xl font-extrabold tracking-tight sm:text-8xl mb-6 text-gray-900 dark:text-gray-100 italic uppercase">
          SHIP <span className="text-brand">Market</span>
        </h1>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed">
          The digital marketplace powered by SHIP tokens. Buy premium Web3 resources, courses, and tools — and earn discounts just for holding SHIP.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/marketplace"
            className="px-10 py-5 bg-brand text-white font-black rounded-full hover:scale-105 transition-all shadow-xl shadow-brand/30 uppercase tracking-widest text-sm"
          >
            Browse Marketplace
          </Link>

        </div>
      </div>
    </div>
  );
}
