const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log("🚀 Starting Refined ANICloud Verification...");

  // 1. Check local database for new categories
  const dbPath = path.join(__dirname, '../data/anime.json');
  if (fs.existsSync(dbPath)) {
    console.log("✅ data/anime.json exists.");
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const categories = ['trending', 'anime_series', 'popular_all_time', 'anime_movies', 'new_releases'];
    categories.forEach(cat => {
      if (db[cat] && db[cat].length > 0) {
        console.log(`✅ Category [${cat}] has ${db[cat].length} entries.`);
      } else {
        console.error(`❌ Category [${cat}] is empty or missing!`);
      }
    });

    // Verify type integrity
    const areMoviesAllMovies = db.anime_movies.every(a => a.type === 'Movie' || a.type === 'Special');
    console.log(areMoviesAllMovies ? "✅ Movies category contains correct types." : "⚠️ Movies category has mixed types.");
  }

  // 2. Component/Route Existence Check
  const routes = [
    'src/app/explore/[category]/page.tsx',
    'src/app/watch/[id]/[episode]/page.tsx',
    'src/app/anime/[id]/page.tsx'
  ];
  routes.forEach(route => {
    const fullPath = path.join(__dirname, '../', route);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Route [${route}] exists.`);
    } else {
      console.error(`❌ Route [${route}] is MISSING!`);
    }
  });

  // 3. API Helper Check
  const apiFile = path.join(__dirname, '../src/lib/api.ts');
  const apiContent = fs.readFileSync(apiFile, 'utf8');
  ['getAnimeSeries', 'getPopularAllTime', 'getStreamUrl'].forEach(func => {
    if (apiContent.includes(func)) {
      console.log(`✅ API helper [${func}] is defined.`);
    } else {
      console.error(`❌ API helper [${func}] is MISSING!`);
    }
  });

  console.log("🏁 Refined Verification Finished.");
}

runTests();
