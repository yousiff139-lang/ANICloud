(async () => {
  const consumet = await import('@consumet/extensions');
  const kai = new consumet.ANIME.AnimeKai();
  console.log("Searching AnimeKai...");
  try {
    const res = await kai.search("Jujutsu Kaisen");
    const animeId = res.results[0].id;
    console.log("ID:", animeId);
    
    const info = await kai.fetchAnimeInfo(animeId);
    console.log("Episodes:", info.episodes?.length);
    
    const ep1 = info.episodes[0];
    console.log("Fetching sources for ep:", ep1.id);
    const sources = await kai.fetchEpisodeSources(ep1.id);
    console.log(sources.sources?.length, "sources found");
    console.log("Source 0 URL:", sources.sources[0]?.url);
  } catch (e) {
    console.error("AnimeKai failed:", e);
  }
})();
