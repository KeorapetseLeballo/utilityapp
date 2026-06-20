import { NextRequest, NextResponse } from 'next/server';
import { registerSchema, loginSchema } from '@/lib/auth';
import { registerUser, loginUser, getUserWithRelations } from '@/features/auth/service';
import {
  createSession,
  sessionCookieOptions,
  clearSessionCookieOptions,
  getSessionUser,
} from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === 'register') {
      const data = registerSchema.parse(body);
      const user = await registerUser(data);
      const token = await createSession(user.id);
      const response = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
      response.cookies.set(sessionCookieOptions(token));
      return response;
    }

    if (action === 'login') {
      const data = loginSchema.parse(body);
      const user = await loginUser(data.email, data.password);
      const token = await createSession(user.id);
      const response = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
      response.cookies.set(sessionCookieOptions(token));
      return response;
    }

    if (action === 'logout') {
      const token = request.cookies.get('utilities_session')?.value;
      if (token) {
        const { deleteSession } = await import('@/lib/session');
        await deleteSession(token);
      }
      const response = NextResponse.json({ ok: true });
      response.cookies.set(clearSessionCookieOptions());
      return response;
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  const full = await getUserWithRelations(user.id);
  return NextResponse.json({ user: full });
}
