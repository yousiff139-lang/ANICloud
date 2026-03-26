import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `ANICloud (${user.email})`
    });

    // Store it in the pending field — NOT yet activated
    await prisma.user.update({
      where: { email: session.user.email },
      data: { twoFactorPending: secret.base32 }
    });

    // Generate QR code data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return NextResponse.json({
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (error) {
    console.error('[2FA Setup Error]:', error);
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 });
  }
}
