# Kraken Portfolio Tracker

A modern, sleek, and mobile-friendly web application that connects to the Kraken exchange API to display and manage cryptocurrency portfolios.

## Core Features

### API Key Management
- Settings page for users to securely enter and manage their Kraken API credentials
- API key and secret storage in the backend
- Connection status indicator showing whether API credentials are valid

### Portfolio Display
- Fetch and display the user's complete portfolio from Kraken
- For each asset, show:
  - Asset name and symbol
  - Current market price
  - Quantity/balance held
  - Cost basis
  - Daily profit/loss in USD
  - Daily profit/loss percentage
- Real-time price updates
- Portfolio total value and overall daily P&L

### Manual Asset Management
- Allow users to manually add additional assets not held on Kraken
- Users can specify asset symbol, quantity, and cost basis for manual entries
- Manual assets are integrated into the overall portfolio view

### AI Integration
- AI-powered portfolio analysis and recommendations based on current holdings
- Real-time market sentiment analysis for each asset using news and social media data
- Technical analysis insights including support/resistance levels, trend indicators, and chart patterns
- Personalized investment suggestions based on risk tolerance and portfolio composition
- AI-generated alerts for significant market events, price movements, or news affecting holdings
- Smart rebalancing recommendations to optimize portfolio allocation
- Risk assessment and diversification analysis with actionable insights
- Market timing suggestions for buying/selling opportunities
- Integration with financial news APIs to provide context-aware investment advice
- Natural language chat interface for asking specific questions about assets or market conditions
- Automated daily/weekly portfolio health reports with AI-generated summaries
- Predictive analytics for potential price movements based on historical patterns and current market data


### User Interface
- Modern, sleek, and professional design
- Fully responsive and optimized for mobile devices
- Visually appealing and clean interface
- Intuitive navigation between portfolio view and settings
- Loading states and error handling for API calls
- App content language: English

## Backend Requirements

### Data Storage
- Store user API credentials securely
- Store manually added assets with their details (symbol, quantity, cost basis)
- Associate data with individual users

### API Integration
- Connect to Kraken API using stored credentials
- Fetch account balances and trading history
- Retrieve current market prices for all assets
- Calculate cost basis and P&L metrics

### Operations
- Validate API credentials
- Retrieve and process portfolio data
- Manage manual asset entries (add, edit, delete)
- Combine Kraken data with manual entries for complete portfolio view