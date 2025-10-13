# Kraken Portfolio Tracker

A modern, sleek, and mobile-friendly web application that connects to the Kraken exchange API to display and manage cryptocurrency portfolios.

## Features

- **API Key Management**: Securely store and manage your Kraken API credentials
- **Portfolio Display**: Real-time portfolio tracking with current prices, balances, and P&L
- **Manual Asset Management**: Add assets not held on Kraken to your portfolio
- **Modern UI**: Clean, responsive design optimized for mobile devices
- **Authentication**: Secure user authentication with Supabase

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **UI Components**: Custom components with Radix UI
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Kraken API account (for live data)
- A Supabase account (for authentication and data storage)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kraken-portfolio-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Go to Settings > API in your Supabase dashboard
   - Copy your Project URL and anon/public key

4. Configure environment variables:
Create a `.env.local` file in the root directory with your actual credentials:
```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here

# Kraken API Configuration (Optional - for live data)
KRAKEN_API_KEY=your-kraken-api-key-here
KRAKEN_API_SECRET=your-kraken-api-secret-here

# AI Integration (Optional - for future use)
OPENAI_API_KEY=your-openai-api-key-here
```

5. Set up Supabase database:
   - Run the migration file: `supabase/migrations/001_initial_schema.sql`
   - Enable Row Level Security (RLS) policies

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── auth/              # Authentication pages
│   ├── settings/          # API key management
│   ├── add-asset/         # Manual asset management
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Portfolio dashboard
├── components/
│   ├── layout/            # Layout components
│   ├── portfolio/         # Portfolio-related components
│   ├── providers/         # Context providers
│   └── ui/                # Reusable UI components
├── lib/
│   ├── supabase.ts        # Supabase client configuration
│   ├── kraken-api.ts      # Kraken API integration
│   └── utils.ts           # Utility functions
├── stores/
│   ├── auth-store.ts      # Authentication state management
│   └── portfolio-store.ts # Portfolio data management
└── types/
    └── index.ts           # TypeScript type definitions
```

## Key Features Implementation

### Authentication
- User registration and login with Supabase Auth
- Protected routes and session management
- Profile management

### Portfolio Management
- Real-time portfolio data from Kraken API
- Manual asset tracking for non-Kraken holdings
- P&L calculations and performance metrics
- Responsive portfolio dashboard

### API Integration
- Secure Kraken API key storage
- Real-time price updates
- Account balance synchronization
- Error handling and connection validation

### Database Schema
- User profiles and authentication
- Secure API key storage
- Manual asset tracking
- Row Level Security (RLS) policies

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Mobile-first responsive design

## Security Considerations

- API keys are stored securely in Supabase with RLS
- Environment variables for sensitive configuration
- Input validation and sanitization
- Protected API routes

## Future Enhancements

- AI-powered portfolio analysis and recommendations
- Advanced charting and technical indicators
- Portfolio rebalancing suggestions
- Multi-exchange support
- Mobile app (React Native)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact the development team or create an issue in the repository.