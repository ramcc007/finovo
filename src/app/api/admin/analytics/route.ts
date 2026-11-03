import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { requireAdmin } from '@/lib/adminAuth';

// Dates are in the GA4 property's reporting time zone.
const RANGES: Record<string, { startDate: string; endDate: string }> = {
  today: { startDate: 'today', endDate: 'today' },
  yesterday: { startDate: 'yesterday', endDate: 'yesterday' },
  '7d': { startDate: '7daysAgo', endDate: 'today' },
  '30d': { startDate: '30daysAgo', endDate: 'today' },
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKey) {
    return NextResponse.json({ error: 'GA4 analytics not configured' }, { status: 501 });
  }

  try {
    const analyticsClient = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, '\n') },
    });
    const property = `properties/${propertyId}`;
    const asked = req.nextUrl.searchParams.get('range') ?? '7d';
    const range = Object.hasOwn(RANGES, asked) ? asked : '7d';
    const dateRanges = [RANGES[range]];

    const [[overview], [topPages], [devices], [locations]] = await Promise.all([
      analyticsClient.runReport({
        property,
        dateRanges,
        metrics: [
          { name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' },
          { name: 'screenPageViews' }, { name: 'averageSessionDuration' },
        ],
      }),
      analyticsClient.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 8,
      }),
      analyticsClient.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),
      analyticsClient.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'country' }, { name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8,
      }),
    ]);

    const [u, n, s, p, d] = (overview.rows?.[0]?.metricValues ?? []).map(v => Number(v.value ?? 0));

    return NextResponse.json({
      range,
      overview: { activeUsers: u || 0, newUsers: n || 0, sessions: s || 0, pageViews: p || 0, avgSessionSec: Math.round(d || 0) },
      topPages: (topPages.rows ?? []).map(r => ({
        path: r.dimensionValues?.[0]?.value ?? '',
        views: Number(r.metricValues?.[0]?.value ?? 0),
      })),
      devices: (devices.rows ?? []).map(r => ({
        category: r.dimensionValues?.[0]?.value ?? '',
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })),
      locations: (locations.rows ?? []).map(r => ({
        country: r.dimensionValues?.[0]?.value ?? '',
        city: r.dimensionValues?.[1]?.value ?? '',
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })),
    });
  } catch {
    // Don't surface raw GA/Google API errors (may include project IDs, quota
    // details, or credential hints) — log server-side, return a generic message.
    return NextResponse.json({ error: 'Analytics query failed.' }, { status: 500 });
  }
}
