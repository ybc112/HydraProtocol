export function Footer() {
  return (
    <footer className="bg-slate-950 text-gray-400 py-12 px-6 border-t border-slate-800">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg"></div>
              <span className="text-xl font-bold text-white">HydraProtocol</span>
            </div>
            <p className="text-sm leading-relaxed">
              Privacy-preserving data marketplace powered by Walrus, Sui, and Zero-Knowledge Proofs.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-emerald-400 transition-colors">Features</a></li>
              <li><a href="#marketplace" className="hover:text-emerald-400 transition-colors">Marketplace</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Roadmap</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Developers</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Smart Contracts</a></li>
              <li><a href="https://github.com" className="hover:text-emerald-400 transition-colors">GitHub</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Forum</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between">
          <div className="text-sm mb-4 md:mb-0">
            © 2025 HydraProtocol. Built for Walrus Haulout 2025 Hackathon.
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
