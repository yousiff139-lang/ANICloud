import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password, twoFactorCode } = await req.json();

    if (!password && !twoFactorCode) {
      return NextResponse.json({ error: 'Please provide your password or a 2FA code to disable 2FA' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    }) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify identity with password OR 2FA code
    let verified = false;

    if (password) {
      verified = await bcrypt.compare(password, user.password);
    }

    if (!verified && twoFactorCode && user.twoFactorSecret) {
      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode
      });
    }

    if (!verified) {
      return NextResponse.json({ error: 'Invalid password or 2FA code' }, { status: 400 });
    }

    // Disable 2FA and clean up recovery codes
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorPending: null,
      }
    });

    // Delete recovery codes
    await prisma.recoveryCode.deleteMany({
      where: { userId: user.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[2FA Disable Error]:', error);
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 });
  }
}
