export const SITE = {
  name: "TOKENMAXX",
  tagline: "The leaderboard for using the most tokens.",
  description:
    "Compete to burn the most AI coding tokens. Connect dozens of providers or T3 Code linkup. Hourly, daily, weekly, monthly leaderboards.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://tokenmaxx.vercel.app",
  github: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/arjunkshah12345-hash/tokenmaxx",
  twitter: "@tokenmaxx",
} as const;
