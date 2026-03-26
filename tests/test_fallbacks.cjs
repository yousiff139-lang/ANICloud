(async () => {
  const consumet = await import('@consumet/extensions');
  const title = "Jujutsu Kaisen";
  
  console.log("Testing KickAssAnime...");
  try {
    const kaa = new consumet.ANIME.KickAssAnime();
    const res = await kaa.search(title);
    console.log("KAA Results:", res.results?.length);
  } catch (e) {
    console.log("KAA failed");
  }

  console.log("Testing AnimeKai...");
  try {
    const kai = new consumet.ANIME.AnimeKai();
    const res = await kai.search(title);
    console.log("Kai Results:", res.results?.length);
  } catch (e) {
    console.log("Kai failed");
  }
})();
