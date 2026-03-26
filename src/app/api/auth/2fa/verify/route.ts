import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import speakeasy from 'speakeasy';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing verification code' }, { status: 400 });
    }

    // Get the pending secret from the DB — NOT from the client
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    }) as any;

    if (!user || !user.twoFactorPending) {
      return NextResponse.json({ error: 'No pending 2FA setup. Please start setup again.' }, { status: 400 });
    }

    // Verify code against the stored pending secret
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorPending,
      encoding: 'base32',
      token: code
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes(8);
    
    // Hash and store recovery codes
    const hashedCodes = await Promise.all(
      recoveryCodes.map(async (c) => ({
        userId: user.id,
        codeHash: await bcrypt.hash(c.replace('-', ''), 10),
      }))
    );

    // Delete any existing recovery codes
    await prisma.recoveryCode.deleteMany({
      where: { userId: user.id }
    });

    // Store new recovery codes
    await prisma.recoveryCode.createMany({
      data: hashedCodes
    });

    // Activate 2FA — move pending secret to active
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        twoFactorSecret: user.twoFactorPending,
        twoFactorEnabled: true,
        twoFactorPending: null,
      }
    });

    return NextResponse.json({ 
      success: true,
      recoveryCodes, // Show these once to the user — they must save them!
    });
  } catch (error) {
    console.error('[2FA Verify Error]:', error);
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 });
  }
}
