import { MetadataRoute } from 'next';

// Public content is open to everyone, including AI search/answer crawlers —
// being quoted and cited by them is a goal. Private/app-only areas stay out.
const PRIVATE = ['/api/', '/admin', '/profile', '/login'];
const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bingbot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...AI_CRAWLERS.map(userAgent => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: 'https://www.scripwise.co.in/sitemap.xml',
  };
}
