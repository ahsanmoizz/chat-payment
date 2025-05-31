export const supportedTokens = [
  // 🔷 EVM Tokens
  {
    name: "Ether",
    symbol: "ETH",
    address: "0x0000000000000000000000000000000000000000", // Native ETH
    decimals: 18,
    type: "evm",
  },
  {
    name: "USD Tether",
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Ethereum Mainnet
    decimals: 6,
    type: "evm",
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    address: "0xA0b86991C6218B36c1d19D4a2e9Eb0cE3606e48",
    decimals: 6,
    type: "evm",
  },
  {
    name: "DAI",
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    type: "evm",
  },

  // 🌐 Non-EVM Tokens
  { name: "Bitcoin", symbol: "BTC", decimals: 8, type: "non-evm" },
  { name: "Ripple", symbol: "XRP", decimals: 6, type: "non-evm" },
  { name: "Dogecoin", symbol: "DOGE", decimals: 8, type: "non-evm" },
  { name: "Solana", symbol: "SOL", decimals: 9, type: "non-evm" },
  { name: "Litecoin", symbol: "LTC", decimals: 8, type: "non-evm" },
  { name: "Cardano", symbol: "ADA", decimals: 6, type: "non-evm" },
  { name: "Polkadot", symbol: "DOT", decimals: 10, type: "non-evm" },
  { name: "Cosmos", symbol: "ATOM", decimals: 6, type: "non-evm" },
  { name: "Stellar", symbol: "XLM", decimals: 7, type: "non-evm" },
  { name: "Bitcoin Cash", symbol: "BCH", decimals: 8, type: "non-evm" },
];
