export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(16, 185, 129) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      <div className="relative text-center">
        {/* Loading Spinner */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-slate-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-24 h-24 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
          <p className="text-gray-400">Please wait a moment</p>
        </div>

        {/* Loading Messages */}
        <div className="flex flex-col gap-2 text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>Connecting to Sui network</span>
          </div>
          <div className="flex items-center justify-center gap-2 animate-pulse" style={{ animationDelay: '0.2s' }}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>Loading smart contracts</span>
          </div>
          <div className="flex items-center justify-center gap-2 animate-pulse" style={{ animationDelay: '0.4s' }}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>Fetching data from blockchain</span>
          </div>
        </div>
      </div>
    </div>
  );
}
