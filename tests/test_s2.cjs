(async () => {
  const consumet = await import('@consumet/extensions');
  const pahe = new consumet.ANIME.AnimePahe();
  const info = await pahe.fetchAnimeInfo("ba42bb01-2bbc-ab83-681c-a094054f4f79");
  console.log("Season 2 Episodes:");
  console.log(info.episodes?.map(e => e.number).slice(0, 5));
})();
