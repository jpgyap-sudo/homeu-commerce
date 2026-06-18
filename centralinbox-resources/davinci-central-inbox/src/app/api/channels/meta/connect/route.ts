import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Connect Meta manually first, then store encrypted page access token in InboxChannel.',
    required: [
      'Meta Developer App',
      'Facebook Page linked to the app',
      'Instagram Professional account linked to Facebook Page',
      'Webhook callback: /api/webhooks/meta',
      'Webhook verify token from META_VERIFY_TOKEN',
      'Page access token stored encrypted',
    ],
  });
}
