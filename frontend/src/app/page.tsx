import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}
