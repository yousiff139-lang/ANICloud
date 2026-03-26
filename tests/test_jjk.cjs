(async () => {
  const consumet = await import('@consumet/extensions');
  const pahe = new consumet.ANIME.AnimePahe();
  const searchResults = await pahe.search("Jujutsu Kaisen");
  const animeId = searchResults.results[0].id;
  console.log("Anime ID:", animeId);
  const info = await pahe.fetchAnimeInfo(animeId);
  console.log("Episodes:", info.episodes?.length);
  const ep = info.episodes?.find(e => e.number === 1);
  if (!ep) { console.log("Ep 1 not found"); return; }
  console.log("Fetching sources for ep 1:", ep.id);
  const sources = await pahe.fetchEpisodeSources(ep.id);
  console.log(sources.sources?.length, "sources found");
})();
