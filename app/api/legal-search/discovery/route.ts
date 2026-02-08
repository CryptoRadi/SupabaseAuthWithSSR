import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server/server';

const BACKEND_URL = process.env.LEGAL_SEARCH_BACKEND_URL || 'http://localhost:8000';

/**
 * GET /api/legal-search/discovery — Proxy to FastAPI GET /api/v1/discovery/all
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/discovery/all`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Backend error' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Discovery proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
