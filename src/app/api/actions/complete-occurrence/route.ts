import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { completeOccurrence } from '@/features/subscriptions/service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'PROVIDER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await request.formData();
  const occurrenceId = form.get('occurrenceId') as string;
  if (!occurrenceId) {
    return NextResponse.json({ error: 'Missing occurrenceId' }, { status: 400 });
  }

  try {
    await completeOccurrence(occurrenceId, user.id);
    return NextResponse.redirect(new URL('/provider', request.url), { status: 303 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
