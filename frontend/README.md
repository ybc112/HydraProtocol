# HydraProtocol Frontend

Beautiful, modern web interface for the HydraProtocol privacy-preserving data marketplace.

## Features

- **Sui Wallet Integration**: Connect with Sui wallets using @suiet/wallet-kit
- **Beautiful UI**: Modern, gradient-based design with smooth animations
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Data Marketplace**: Browse and purchase privacy-preserving datasets
- **ZKP Verification**: Visual representation of zero-knowledge proof capabilities

## Tech Stack

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first CSS framework
- **Suiet Wallet Kit**: Sui blockchain wallet integration
- **@mysten/sui**: Sui blockchain TypeScript SDK

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Sui wallet (Suiet, Ethos, or Sui Wallet)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with WalletProvider
│   │   ├── page.tsx         # Main landing page
│   │   └── globals.css      # Global styles
│   └── components/
│       ├── WalletProvider.tsx  # Sui wallet context provider
│       ├── Header.tsx          # Navigation header with wallet button
│       ├── Hero.tsx            # Hero section with CTA
│       ├── Features.tsx        # Feature showcase grid
│       ├── Marketplace.tsx     # Data marketplace with filters
│       └── Footer.tsx          # Footer with links
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Smart Contract Integration

The frontend connects to the HydraProtocol smart contracts deployed on Sui testnet:

- **Package ID**: `0x2716ea3a391ca6e8cc5f2d0a7dc99f6186990c04dad0274b29bf5a93600fa2c6`
- **Network**: Sui Testnet

## Design Philosophy

The frontend follows modern Web3 design principles:

1. **Simplicity**: Clean, intuitive interface that hides blockchain complexity
2. **Trust**: Visual verification indicators for ZKP and data authenticity
3. **Progressive Disclosure**: Advanced features revealed as users explore
4. **Accessibility**: Clear language, good contrast, responsive layout
5. **Beautiful**: Gradient backgrounds, smooth animations, card-based design

## Key Components

### WalletProvider
Wraps the application with Suiet Wallet Kit context, enabling wallet connection throughout the app.

### Header
Fixed navigation bar with wallet connection button, showing connection status and user address.

### Hero
Eye-catching landing section with animated gradient background and clear value proposition.

### Features
Grid showcasing 6 key features with icons and descriptions.

### Marketplace
Interactive data marketplace with category filtering and dataset cards showing price, provider, and stats.

### Footer
Comprehensive footer with links to docs, community, and legal pages.

## Customization

### Colors
Edit `tailwind.config.ts` to customize the color scheme:

```typescript
colors: {
  primary: { /* your colors */ },
  secondary: { /* your colors */ }
}
```

### Smart Contract Address
Update the package ID in components that interact with contracts.

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Cloudflare Pages
- Self-hosted with Docker

## Contributing

This project was built for the Walrus Haulout 2025 Hackathon.

## License

MIT License - see LICENSE file for details
