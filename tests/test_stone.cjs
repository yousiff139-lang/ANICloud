(async () => {
  const consumet = await import('@consumet/extensions');
  const kai = new consumet.ANIME.AnimeKai();
  console.log("Searching AnimeKai for Dr. Stone...");
  try {
    const res = await kai.search("Dr. STONE");
    if (res.results.length === 0) {
      console.log("No results found.");
      return;
    }
    const animeId = res.results[0].id;
    console.log("ID:", animeId);
    
    const info = await kai.fetchAnimeInfo(animeId);
    console.log("Episodes:", info.episodes?.length);
  } catch (e) {
    console.error("AnimeKai failed:", e);
  }
})();
