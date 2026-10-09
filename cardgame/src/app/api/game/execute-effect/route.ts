import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  // Existing effects carry functions, which cannot be transported as JSON.
  return NextResponse.json({ error: 'Activation des effets indisponible' }, { status: 501 });
}
