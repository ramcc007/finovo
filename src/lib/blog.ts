// Blog content. Inline markup supported in strings: **bold** and [text](/path).

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string; id: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] };

export interface Post {
  slug: string;
  title: string;
  description: string; // meta description (~155 chars)
  excerpt: string;
  author: string; // one of AUTHORS, picked at random when the post is added
  category: string;
  tags: string[];
  publishedAt: string; // ISO date
  updatedAt: string;
  readingMinutes: number;
  keyTakeaways: string[];
  faq: { q: string; a: string }[];
  body: Block[];
  disclaimer: string;
}

// Bylines for blog posts. Each new post gets one of these at random (fixed per post, not per page view).
export const AUTHORS = [
  'Prateek Desai',
  'Ram Das',
  'Preeta Kulkarni',
  'Rahul Dev',
  'Veena Sharma',
  'Ankit Gupta',
  'Vaibhav Poddar',
  'Avinash Solanki',
] as const;

export const POSTS: Post[] = [
  {
    slug: 'if-everyone-is-selling-indian-stocks-what-should-retail-investor-buy',
    title: "If Everyone's Selling Indian Stocks, What Should a Retail Investor Actually Buy?",
    description:
      'FPIs have pulled over ₹3 lakh crore out of Indian stocks this year but SIP money keeps coming in. What a retail investor can actually do right now.',
    excerpt:
      "Everyone is not selling, it's mostly the foreigners. A plain look at who's buying, what's got cheaper and what a regular investor can do now.",
    author: 'Veena Sharma',
    category: 'Market Insights',
    tags: [
      'FPI selling',
      'Indian stock market',
      'Nifty 50',
      'SIP',
      'Index funds',
      'Retail investors',
      'Stock screener',
      'RBI repo rate',
      'Market correction',
      'Valuation',
    ],
    publishedAt: '2026-10-31',
    updatedAt: '2026-10-31',
    readingMinutes: 6,
    keyTakeaways: [
      `It's mainly foreigners selling. FPIs have pulled out more than ₹3 lakh crore this year, while domestic institutions bought ₹76,030 crore in September alone.`,
      `SIP money hasn't panicked, September was a record ₹32,490 crore.`,
      `Nifty is at roughly 19x trailing earnings vs about 22 on a five year average. Cheaper, not dirt cheap.`,
      `What I'd do: keep the SIP going, use an index fund if you don't want to pick stocks, stagger any lump sum, and check debt, return on capital, growth and pledging before buying any single stock.`,
      `Skip small caps just because they fell, F&O bottom fishing, Telegram tips and investing with borrowed money.`,
    ],
    faq: [
      {
        q: 'Is everyone really selling Indian stocks right now?',
        a: `Not really. It's mainly FPIs, who've pulled more than ₹3 lakh crore out this year. On the other side, domestic institutions bought ₹76,030 crore in September alone and SIP money kept coming in.`,
      },
      {
        q: 'Why are foreign investors selling India?',
        a: `Mostly stuff outside India. Crude went to $100, US bond yields are high and the rupee was around 96 to a dollar at the start of October. For someone investing in dollars that combination hurts, even if Indian companies are doing okay.`,
      },
      {
        q: 'Should I stop my SIP when the market falls?',
        a: `I wouldn't. Your same monthly amount buys more units when prices are down, that's literally how a SIP is supposed to work. Stopping now means you bought all the expensive units on the way up and skipped the cheap ones.`,
      },
      {
        q: 'Is the Nifty 50 cheap right now?',
        a: `Cheaper, not cheap. It's around 19 times trailing earnings against roughly 22 on a five year average. Reasonable, but it can still go lower from here.`,
      },
      {
        q: 'How do I pick stocks after a market fall?',
        a: `Start with a screener and filter for low debt, steady return on capital, growing sales and profit, and little or no promoter pledging. Then read the latest results yourself. You're trying to find out if only the price fell or if the business actually got worse.`,
      },
      {
        q: 'Should I put my lump sum in all at once?',
        a: `Probably not in a market like this. Split it into 5 or 6 parts and invest one every few weeks. Keep the rest in an FD or a liquid fund till then.`,
      },
      {
        q: 'Small caps have fallen the most, are they a good buy now?',
        a: `Not just because they fell. Small caps can stay cheap and keep getting cheaper for a long time, 2018 was like that. If you do buy some, be very picky about which ones.`,
      },
    ],
    disclaimer:
      'This article is only for information and education. It is not investment advice or a recommendation to buy or sell any security. Please consult a SEBI-registered investment adviser before making any investment decisions.',
    body: [
      {
        type: 'p',
        text: `Quick correction before anything else, **everyone is not selling**. It just feels that way if you switch on any business channel after 9:15.`,
      },
      {
        type: 'p',
        text: `The ones selling are the foreigners. FPIs have taken more than ₹3 lakh crore out of Indian equities this year, which is almost double of what they pulled out in the whole of 2025 (and 2025 wasn't exactly a great year for flows either). October on its own has crossed ₹48,000 crore, and that number is only till the 25th.`,
      },
      {
        type: 'p',
        text: `But here's the part that doesn't get as much airtime. Somebody is buying all those shares and it's mostly us. Domestic institutions put ₹76,030 crore into the cash market in September alone. Mutual funds, insurance companies, pension money... and a big chunk of that is just regular salaried people's SIPs getting invested every month. The SIP book hit a fresh record of ₹32,490 crore in September and less SIPs got stopped compared to August, which honestly surprised me a little given how the market has been behaving.`,
      },
      {
        type: 'p',
        text: `So the question isn't really "should I buy when everybody is selling". It's more like, the foreign guy is selling, the domestic fund is buying, who do you think has the better reason?`,
      },
      { type: 'h2', id: 'why-are-fpis-dumping-india', text: 'Okay so why are FPIs dumping India?' },
      {
        type: 'p',
        text: `Not because of India, mostly. Crude has been the big one. Brent went up to $100 with the whole West Asia situation, and since we import most of our oil that hurts us more than most countries. Then you have US bond yields sitting high, and the rupee went to about 96 a dollar at the start of October. If you're a fund in New York your India returns are getting eaten by the currency before any company here even reports a bad quarter. Most of the strategists I've read are calling this a global reallocation thing and not some verdict on Indian growth.`,
      },
      {
        type: 'p',
        text: `This matters a lot, actually more than anything else in this article. If someone is selling a stock because the company is in trouble, the falling price is telling you something about the company. If they're selling because a US Treasury is paying them a better yield, the falling price is mostly telling you about America. Different thing altogether.`,
      },
      {
        type: 'p',
        text: `(I'm not saying it's always that clean, usually there's a bit of both. But you get the idea.)`,
      },
      { type: 'h2', id: 'what-has-got-cheaper', text: 'What has actually got cheaper' },
      {
        type: 'p',
        text: `The Nifty touched 26,373 on 5th January, that's the record. Last week it was moving around 22,600 to 22,750. It had fallen eight weeks in a row going into October, which apparently hasn't happened in 25 years.`,
      },
      {
        type: 'p',
        text: `On valuation the Nifty is now at around 19x trailing earnings. The five year average is closer to 22. Is that cheap cheap? No. But it's a lot more reasonable than January, when everybody was very happy and nobody was asking this question.`,
      },
      {
        type: 'p',
        text: `What I find more useful though is looking below the index. By the end of September, 252 stocks out of the Nifty 500 were down 30% or more from their own highs, so basically half the broader market has already had a proper correction. At the same time pharma, healthcare, metals and capital goods were actually up somewhere between 13 and 19% this year. So when someone says "the market is down", it depends a lot on which market you mean. Some sectors are genuinely at a discount. Some never fell, and buying them now is not really buying the dip.`,
      },
      { type: 'h2', id: 'what-should-you-buy', text: 'So what should you buy' },
      {
        type: 'p',
        text: `I'm not going to give stock names here, I don't know your salary, your EMIs or how you'll feel if your portfolio is down another 20% next month, and any tip that ignores all that is pretty useless. What I can do is tell you how I'd think about it, roughly in this order.`,
      },
      {
        type: 'ol',
        items: [
          `Don't touch your SIP. Seriously. It's boring advice and everyone says it, but there's a reason everyone says it. When the market falls the same SIP amount buys you more units, that's the whole point. People who stop SIPs in a fall basically buy high all the way up and then walk out right when the sale starts. If your job is stable you could even step it up a bit.`,
          `If you don't want the headache of picking stocks, just buy the index. A Nifty 50 index fund or ETF at 19 times earnings is not the same thing as buying it in January at the top. You aren't betting on one company, you're betting that India's top 50 businesses will be worth more 7-10 years from now. Most of us are fine with that bet, I think.`,
          `Don't put everything in at once. If you've got a lump sum lying around, break it into 5 or 6 parts and put one in every few weeks. Keep the rest in an FD or a liquid fund while you wait. RBI hiked the repo rate to 5.50% on 7th October, the first hike in almost three years, so deposit rates should go up a little and the money sitting on the side won't be completely idle.`,
          `And if you do pick individual stocks, this is where the FPI selling can actually work for you. When big funds exit they sell whatever is liquid, good stuff along with the bad, so you get decent companies falling for no fault of their own. The work is in separating the two. A few basic filters get you most of the way:`,
        ],
      },
      {
        type: 'ul',
        items: [
          `low debt, or debt that's coming down (matters more now that rates are going up)`,
          `return on capital that's been steady for years, not just one good year`,
          `sales and profit still growing in the latest quarter. Q2FY27 numbers are coming in right now so check those`,
          `promoter pledging, ideally none, or at least reducing`,
        ],
      },
      {
        type: 'p',
        text: `You can run these on a screener, the [High Quality Compounders screen on Scripwise](/screens) is a decent place to start. But please actually read the results after that. A screener gets you a shortlist, it doesn't tell you why the price fell, and that's the only question that really matters here. **Did the stock fall, or did the business fall?**`,
      },
      { type: 'h2', id: 'what-i-would-avoid', text: `What I'd avoid` },
      {
        type: 'p',
        text: `Small caps just because they've fallen the most. They fall the most for a reason, they were the most expensive going in and there's nobody to buy when everyone wants out at the same time. What worries me a bit is that in September small-cap funds got the biggest inflows of any equity category. I understand why people are doing it, but small caps can stay "cheap" and keep getting cheaper for a long time. 2018 was like that.`,
      },
      {
        type: 'p',
        text: `F&O to try and catch the bottom, tips from Telegram groups, taking a loan to invest... please no. When the market is falling because of what's happening globally, leverage is how a bad month turns into years of trying to recover.`,
      },
      { type: 'h2', id: 'where-is-the-bottom', text: 'Where is the bottom?' },
      {
        type: 'p',
        text: `Honestly, no one knows. The bear market line, which is a 20% fall from the top, is around 21,100 for the Nifty and we're not very far from it. Crude could go up again, Q2 results could disappoint, a lot can happen. What I'd suggest is one simple check before you invest anything. **If the market falls another 10% right after you buy, are you still okay with your plan?** If not, you're probably taking more risk than you realise, and it's much better to find that out now than in the middle of a bad week.`,
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find(p => p.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
