(async () => {
  const consumet = await import('@consumet/extensions');
  const pahe = new consumet.ANIME.AnimePahe();
  
  console.log("Searching for One Piece...");
  const searchResults = await pahe.search("One Piece");
  if (!searchResults.results.length) {
    console.error("No results found.");
    return;
  }
  
  const animeId = searchResults.results[0].id;
  console.log("Found anime ID:", animeId);
  
  const animeInfo = await pahe.fetchAnimeInfo(animeId);
  console.log("Episodes available:", animeInfo.episodes?.length);
  
  const ep1 = animeInfo.episodes?.find((e) => e.number === 1);
  if (!ep1) {
    console.error("Episode 1 not found");
    return;
  }
  
  console.log("Fetching sources for Episode 1 ID:", ep1.id);
  const sources = await pahe.fetchEpisodeSources(ep1.id);
  
  console.log(JSON.stringify(sources, null, 2));
})();
