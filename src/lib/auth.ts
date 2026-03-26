// Last updated: 2026-03-24T18:52:00.000Z
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('[Auth] Authorize started for:', credentials?.email);
        try {
          if (!credentials?.email || !credentials?.password) {
            console.warn('[Auth] Missing credentials');
            return null;
          }
          
          const user = await prisma.user.findUnique({ 
            where: { email: credentials.email } 
          }) as any;

          console.log('[Auth] User search result:', user ? `Found (ID: ${user.id})` : 'Not Found');
          
          if (!user) {
            // ... (auto-register logic)
            console.log('[Auth] Auto-registering user:', credentials.email);
            const hashedPassword = await bcrypt.hash(credentials.password, 10);
            const newUser = await prisma.user.create({
              data: {
                email: credentials.email,
                password: hashedPassword,
                name: credentials.email.split('@')[0],
              }
            });
            return { id: newUser.id, name: newUser.name, email: newUser.email };
          }
          
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordValid) {
            console.warn('[Auth] Invalid password for:', credentials.email);
            return null;
          }

            // Handle 2FA if enabled
          if (user.twoFactorEnabled && user.twoFactorSecret) {
            const twoFactorCode = (credentials as any).twoFactorCode;
            
            if (!twoFactorCode) {
              console.log('[Auth] 2FA Required for:', user.email);
              throw new Error("2FA_REQUIRED");
            }

            const speakeasy = require('speakeasy');
            const isValid = speakeasy.totp.verify({
              secret: user.twoFactorSecret,
              encoding: 'base32',
              token: twoFactorCode
            });

            if (!isValid) {
              console.warn('[Auth] Invalid 2FA code for:', user.email);
              throw new Error("INVALID_2FA_CODE");
            }
          }
          
          console.log('[Auth] Login successful for:', user.id);
          return { id: user.id, name: user.name, email: user.email };
        } catch (error: any) {
          console.error('[Auth] Authorize EXCEPTION:', error.message || error);
          throw error; // Propagate error for the login page to handle
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-dev-only-do-not-use-in-prod",
  session: { strategy: "jwt" },
  callbacks: {
    async redirect({ url, baseUrl }) {
      console.log('[Auth] Redirect callback:', { url, baseUrl });
      
      // If redirecting to login after successful sign in, override to home or profile
      if (url.includes('/login') || url.includes('/api/auth') || url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/`;
      }
      
      // If URL starts with base URL, or is a relative path, it's safe to redirect
      if (url.startsWith(baseUrl) || url.startsWith('/')) {
        return url.startsWith('/') ? `${baseUrl}${url}` : url;
      }
      
      // Default to home page
      return baseUrl;
    },
    async jwt({ token, user, trigger, session }) {
      try {
        // Handle manual session update trigger (from client-side update())
        if (trigger === "update") {
          const userId = (token.id || token.sub) as string;
          console.log(`[Auth] JWT update trigger received for user: ${userId}`);
          
          // Always re-fetch from DB to ensure we have the latest and avoid passing large base64 in cookie
          const freshUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
          });
          
          if (freshUser) {
            token.id = freshUser.id; // Ensure ID is present
            token.name = freshUser.name;
            token.picture = freshUser.profile?.avatar ? `/api/profile/avatar?v=${Date.now()}` : null;
            token.plan = "ultimate";
            console.log('[Auth] JWT refreshed from DB successfully:', { 
              name: token.name, 
              hasAvatar: !!freshUser.profile?.avatar,
              plan: token.plan 
            });
          } else {
            console.error('[Auth] JWT refresh failed - user not found in DB with ID:', userId);
          }
          return token;
        }

        if (user) {
          console.log('[Auth] JWT callback - Initial sign in for:', user.email);
          token.id = user.id;
          token.name = user.name;
          
          // Fetch profile on initial sign in
          try {
            const userWithProfile = await prisma.user.findUnique({
              where: { id: user.id },
              include: { profile: true }
            });
            console.log('[Auth] JWT Initial DB Sync:', { id: user.id, found: !!userWithProfile });
            token.plan = "ultimate";
            token.picture = userWithProfile?.profile?.avatar ? `/api/profile/avatar?v=${Date.now()}` : null;
            if (userWithProfile?.name) token.name = userWithProfile.name;
            
            console.log('[Auth] JWT callback - Data assigned:', { plan: token.plan, hasAvatar: !!token.picture });
          } catch (subErr) {
            console.error('[Auth] JWT callback - DB fetch failed:', subErr);
            token.plan = "ultimate"; 
          }
        } else if (!token.id && token.sub) {
          // Sync token.id with token.sub for consistency if missing
          token.id = token.sub;
        }
        return token;
      } catch (error) {
        console.error('[Auth] JWT callback CRITICAL ERROR:', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          (session.user as any).id = token.id;
          (session.user as any).plan = "ultimate";
          session.user.name = token.name as string | null;
          session.user.image = token.picture as string | null;
        }
        return session;
      } catch (error) {
        console.error('[Auth] Session callback ERROR:', error);
        return session;
      }
    },
    async signIn({ user, account }) {
      try {
        const userEmail = user.email;
        console.log('[Auth] SignIn Callback:', { email: userEmail, provider: account?.provider });
        if (!userEmail) {
          console.error('[Auth] SignIn Failed: Missing Email');
          return false;
        }

        if (account?.provider === "google") {
          const existingUser = await prisma.user.findUnique({
            where: { email: userEmail }
          });

          if (!existingUser) {
            const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10);
            const newUser = await prisma.user.create({
              data: {
                email: userEmail,
                name: user.name || userEmail.split("@")[0],
                password: hashedPassword,
              }
            });
            
            if (user.image) {
              await prisma.userProfile.create({
                data: { userId: newUser.id, avatar: user.image }
              });
            }
            user.id = newUser.id;
          } else {
            if (user.image) {
              await prisma.userProfile.upsert({
                where: { userId: existingUser.id },
                update: { avatar: user.image },
                create: { userId: existingUser.id, avatar: user.image }
              });
            }
            user.id = existingUser.id;
          }
        }
        
        if (userEmail === "karrarmayaly@gmail.com") {
          console.log('[Auth] Admin user recognized:', userEmail);
          // No subscription to upsert anymore
        }
        
        return true;
      } catch (error) {
        console.error('[Auth] SignIn Error CRITICAL:', error);
        return false; // Return false on error to prevent broken sessions
      }
    }
  },
  pages: { 
    signIn: "/login",
    error: "/login" // Redirect to login page on error
  },
  debug: process.env.NODE_ENV === 'development',
};
