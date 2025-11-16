export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(16, 185, 129) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      <div className="relative text-center max-w-2xl">
        {/* 404 Text */}
        <div className="mb-8">
          <h1 className="text-9xl md:text-[200px] font-bold text-emerald-500/20 leading-none mb-4">
            404
          </h1>
          <div className="text-4xl md:text-6xl font-bold text-white mb-4">
            Page Not Found
          </div>
          <p className="text-xl text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <a
            href="/"
            className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500 transition-all group"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Home</span>
          </a>
          <a
            href="/marketplace"
            className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500 transition-all group"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Marketplace</span>
          </a>
          <a
            href="/compute"
            className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500 transition-all group"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Compute</span>
          </a>
          <a
            href="/docs"
            className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500 transition-all group"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Docs</span>
          </a>
        </div>

        {/* Go Home Button */}
        <a
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-all hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Go Back Home
        </a>
      </div>
    </div>
  );
}
