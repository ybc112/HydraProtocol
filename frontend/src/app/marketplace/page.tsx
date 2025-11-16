import { Header } from '@/components/Header';
import { Marketplace } from '@/components/Marketplace';
import { Footer } from '@/components/Footer';

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-slate-900">
      <Header />
      <div className="pt-20">
        <Marketplace />
      </div>
      <Footer />
    </main>
  );
}
