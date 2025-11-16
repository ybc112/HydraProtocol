'use client';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-slate-900">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(16, 185, 129) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      {/* Animated glow */}
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <span className="text-sm font-semibold text-emerald-400">Powered by Walrus + Sui + Zero-Knowledge Proofs</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
            Privacy-First Data Marketplace
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 mb-8 leading-relaxed">
            Share and monetize sensitive data without compromising privacy.
            <br className="hidden md:block" />
            Powered by cutting-edge zero-knowledge cryptography.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button className="px-8 py-4 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 hover:scale-105 transition-all duration-300">
              Explore Marketplace
            </button>
            <button className="px-8 py-4 bg-slate-800 border-2 border-slate-700 text-gray-300 rounded-lg font-semibold hover:border-emerald-500 hover:text-emerald-400 transition-all duration-300">
              Learn More
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">100%</div>
              <div className="text-sm text-gray-500 mt-1">Private</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-teal-400">ZKP</div>
              <div className="text-sm text-gray-500 mt-1">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">∞</div>
              <div className="text-sm text-gray-500 mt-1">Scalable</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
