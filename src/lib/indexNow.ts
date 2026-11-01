// IndexNow (Bing, Yandex, Seznam, Naver and others) — tells participating
// search engines a URL is new/changed. Google doesn't use IndexNow; it picks
// the sitemap up via Search Console. The key is public by design: it must be
// served at /<key>.txt to prove we own the host.
const KEY = '2ce8e624cd28fe997f3d981acd7e5039';
const HOST = 'www.scripwise.co.in';

export async function pingIndexNow(paths: string[]): Promise<void> {
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: paths.map(p => `https://${HOST}${p}`),
      }),
    });
  } catch {
    // best-effort; never block a save on a search-engine ping
  }
}
