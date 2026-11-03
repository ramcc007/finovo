import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { requireAdmin } from '@/lib/adminAuth';

// GA4 Realtime: the last 30 minutes (the API limit for standard properties).
// Note: the Realtime API has no page-path dimension, so pages are listed by
// page title (unifiedScreenName).
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!propertyId || !clientEmail || !privateKey) {
    return NextResponse.json({ error: 'GA4 analytics not configured' }, { status: 501 });
  }

  try {
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, '\n') },
    });
    const property = `properties/${propertyId}`;
    const metrics = [{ name: 'activeUsers' }, { name: 'screenPageViews' }];

    const [[totals], [pages], [devices], [locations], [perMinute]] = await Promise.all([
      client.runRealtimeReport({ property, metrics }),
      client.runRealtimeReport({
        property, dimensions: [{ name: 'unifiedScreenName' }], metrics,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 8,
      }),
      client.runRealtimeReport({
        property, dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),
      client.runRealtimeReport({
        property, dimensions: [{ name: 'country' }, { name: 'city' }], metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 8,
      }),
      client.runRealtimeReport({
        property, dimensions: [{ name: 'minutesAgo' }], metrics: [{ name: 'activeUsers' }],
      }),
    ]);

    const num = (v?: string | null) => Number(v ?? 0) || 0;
    const t = totals.rows?.[0]?.metricValues ?? [];
    const minutes = Array<number>(30).fill(0); // index 0 = 29 min ago … 29 = now
    for (const r of perMinute.rows ?? []) {
      const ago = num(r.dimensionValues?.[0]?.value);
      if (ago >= 0 && ago < 30) minutes[29 - ago] = num(r.metricValues?.[0]?.value);
    }

    return NextResponse.json({
      activeUsers: num(t[0]?.value),
      pageViews: num(t[1]?.value),
      perMinute: minutes,
      pages: (pages.rows ?? []).map(r => ({
        title: (r.dimensionValues?.[0]?.value ?? '').replace(/\s*[|·–—-]\s*Scripwise\s*$/i, ''),
        users: num(r.metricValues?.[0]?.value),
        views: num(r.metricValues?.[1]?.value),
      })),
      devices: (devices.rows ?? []).map(r => ({
        category: r.dimensionValues?.[0]?.value ?? '',
        users: num(r.metricValues?.[0]?.value),
      })),
      locations: (locations.rows ?? []).map(r => ({
        country: r.dimensionValues?.[0]?.value ?? '',
        city: r.dimensionValues?.[1]?.value ?? '',
        users: num(r.metricValues?.[0]?.value),
      })),
    }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Realtime query failed.' }, { status: 500 });
  }
}
