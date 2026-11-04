// Curated content for the glossary home page. Terms are matched by name, so a name that is not
// published yet is simply left out. Edit these lists to change what the page promotes.

export const POPULAR_TERMS = ['SIP', 'NAV (Net Asset Value)', 'IPO', 'PE Ratio', 'Nifty 50', 'Demat Account', 'ELSS', 'LTCG', 'Call Option', 'Repo Rate'];

export interface LearningPath { id: string; title: string; blurb: string; terms: string[] }
export const LEARNING_PATHS: LearningPath[] = [
  { id: 'stocks', title: 'Start investing in stocks', blurb: 'The accounts, the rules and the first numbers to read.', terms: ['KYC', 'Demat Account', 'Trading Account', 'Market Capitalisation', 'PE Ratio', 'Dividend'] },
  { id: 'funds', title: 'Understand mutual funds', blurb: 'How a fund is priced, bought and measured.', terms: ['NAV (Net Asset Value)', 'SIP', 'Index Fund', 'ETF', 'Exit Load', 'XIRR'] },
  { id: 'tax', title: 'Taxes on your gains', blurb: 'What you owe, and the usual ways to plan for it.', terms: ['STCG', 'LTCG', 'STT (Securities Transaction Tax)', 'ELSS', 'Tax Loss Harvesting'] },
  { id: 'derivatives', title: 'Futures and options basics', blurb: 'The vocabulary of derivatives before you place a trade.', terms: ['Futures Contract', 'Call Option', 'Put Option', 'Strike Price', 'Lot Size', 'Expiry Day'] },
];

export const CATEGORY_STYLE: Record<string, { pill: string; dot: string; blurb: string }> = {
  'Investing Basics': { pill: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500', blurb: 'Accounts, IPOs and the ratios behind a company.' },
  'Stock Market': { pill: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500', blurb: 'Exchanges, indices and corporate actions.' },
  'Trading': { pill: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', blurb: 'Orders, futures, options and margins.' },
  'Mutual Funds': { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', blurb: 'SIPs, NAV and how funds are measured.' },
  'Taxes': { pill: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500', blurb: 'Capital gains and tax-saving investments.' },
  'Economy': { pill: 'bg-teal-50 text-teal-700 ring-teal-200', dot: 'bg-teal-500', blurb: 'Rates and the economy behind markets.' },
};
export const styleOf = (category: string) => CATEGORY_STYLE[category] ?? { pill: 'bg-slate-50 text-slate-700 ring-slate-200', dot: 'bg-slate-400', blurb: '' };

export const GLOSSARY_FAQ = [
  { q: 'What is a stock market glossary?', a: 'A glossary explains the words used in investing and trading, such as SIP, NAV, P/E ratio and repo rate, in plain language so that a statement, a news report or an app screen is easier to follow.' },
  { q: 'Is this glossary only for India?', a: 'It is written for Indian investors. Each term explains how it works in India, including the exchanges, regulator, taxes and rules that apply here.' },
  { q: 'Where should a beginner start?', a: 'Pick one of the learning paths near the top of this page. Each one lists a handful of terms in a sensible order, starting with the basics of the topic.' },
  { q: 'Is this investment advice?', a: 'No. The terms are educational and do not recommend any security, fund or strategy. Check the details with your broker, the fund house or a registered adviser before you act.' },
];
