import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const onlyFavorites = searchParams.get('favorites') === 'true';

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const where: any = { userId: user.id };
  if (onlyFavorites) {
    where.isFavorite = true;
  } else {
    where.isLibrary = true;
  }

  const library = await prisma.libraryItem.findMany({
    where,
    orderBy: { addedAt: 'desc' }
  });

  console.log(`[Library GET] User: ${user.id}, FavoritesOnly: ${onlyFavorites}, Count: ${library.length}`);
  return NextResponse.json(library);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { animeId, title, image, type = 'library' } = body;

  if (!animeId || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isFavorite = type === 'favorite';
  const isLibrary = type === 'library';

  try {
    const item = await prisma.libraryItem.upsert({
      where: {
        userId_animeId: {
          userId: user.id,
          animeId: Number(animeId)
        }
      },
      update: {
        ...(isFavorite && { isFavorite: true }),
        ...(isLibrary && { isLibrary: true }),
      } as any,
      create: {
        userId: user.id,
        animeId: Number(animeId),
        title,
        image,
        isFavorite: isFavorite,
        isLibrary: true, // Always add to library when interacting
      } as any
    });

    revalidatePath('/library');
    revalidatePath('/favorites');
    
    console.log(`[Library POST SUCCESS] User: ${user.id}, Anime: ${animeId}, isFavorite: ${isFavorite}, isLibrary: ${isLibrary}`);
    return NextResponse.json(item);
  } catch (error) {
    console.error(`[Library POST ERROR] User: ${user.id}, Anime: ${animeId}:`, error);
    return NextResponse.json({ error: "Failed to update library status" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const animeId = searchParams.get('animeId');
  const type = searchParams.get('type') || 'library';

  if (!animeId) return NextResponse.json({ error: "Missing animeId" }, { status: 400 });

  const id = Number(animeId);

  try {
    const existing = await prisma.libraryItem.findUnique({
      where: { userId_animeId: { userId: user.id, animeId: id } }
    });

    if (!existing) return NextResponse.json({ success: true });

    const updateData: any = {};
    if (type === 'favorite') updateData.isFavorite = false;
    else updateData.isLibrary = false;

    const nextIsFavorite = type === 'favorite' ? false : (existing as any).isFavorite;
    const nextIsLibrary = type === 'library' ? false : (existing as any).isLibrary;

    if (!nextIsFavorite && !nextIsLibrary) {
      await prisma.libraryItem.delete({
        where: { userId_animeId: { userId: user.id, animeId: id } }
      });
    } else {
      await prisma.libraryItem.update({
        where: { userId_animeId: { userId: user.id, animeId: id } },
        data: updateData
      });
    }

    revalidatePath('/library');
    revalidatePath('/favorites');

    console.log(`[Library DELETE SUCCESS] User: ${user.id}, Anime: ${id}, Type: ${type}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[Library DELETE ERROR] User: ${user.id}, Anime: ${id}:`, error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
