(async () => {
  const consumet = await import('@consumet/extensions');
  const kai = new consumet.ANIME.AnimeKai();
  try {
    const res = await kai.search("Dr. STONE");
    const info = await kai.fetchAnimeInfo(res.results[0].id);
    console.log("AnimeKai Episode 1 structure:", JSON.stringify(info.episodes[0], null, 2));
  } catch (e) {
    console.error(e);
  }
})();
