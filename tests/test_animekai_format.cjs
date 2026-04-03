(async () => {
  const consumet = await import('@consumet/extensions');
  const provider = new consumet.ANIME.AnimeKai();
  const searchResults = await provider.search("Jujutsu Kaisen");
  console.log("First Result:", searchResults.results[0]);
})();
