import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { requireAdmin } from '@/lib/adminAuth';

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
    const overviewMetrics = [
      { name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' },
      { name: 'screenPageViews' }, { name: 'averageSessionDuration' },
    ];

    const [overview7d] = await analyticsClient.runReport({
      property,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: overviewMetrics,
    });
    const [overview30d] = await analyticsClient.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: overviewMetrics,
    });
    const [topPages] = await analyticsClient.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8,
    });
    const [devices] = await analyticsClient.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    });
    const [locations] = await analyticsClient.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'country' }, { name: 'city' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8,
    });

    const rowVals = (rows: { metricValues?: { value?: string | null }[] | null }[] | null | undefined) =>
      (rows?.[0]?.metricValues ?? []).map(v => Number(v.value ?? 0));

    const [u7, n7, s7, p7, d7] = rowVals(overview7d.rows);
    const [u30, n30, s30, p30, d30] = rowVals(overview30d.rows);

    return NextResponse.json({
      last7d: { activeUsers: u7 || 0, newUsers: n7 || 0, sessions: s7 || 0, pageViews: p7 || 0, avgSessionSec: Math.round(d7 || 0) },
      last30d: { activeUsers: u30 || 0, newUsers: n30 || 0, sessions: s30 || 0, pageViews: p30 || 0, avgSessionSec: Math.round(d30 || 0) },
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
