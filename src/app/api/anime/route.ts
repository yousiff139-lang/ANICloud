import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'anime.json');
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 404 });
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const anime = JSON.parse(data);
    return NextResponse.json(anime);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}
