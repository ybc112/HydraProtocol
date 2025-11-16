import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "HydraProtocol - Privacy-Preserving Data Marketplace",
  description: "Decentralized privacy computing protocol combining Walrus storage, Zero-Knowledge Proofs, and Sui smart contracts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
