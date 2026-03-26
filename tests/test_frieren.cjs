(async () => {
  const consumet = await import('@consumet/extensions');
  const pahe = new consumet.ANIME.AnimePahe();
  console.log("Searching Frieren...");
  const frieren = await pahe.search("Frieren: Beyond Journey's End");
  console.log(frieren.results.map(r => r.title));

  console.log("Searching Sousou no Frieren...");
  const frieren2 = await pahe.search("Sousou no Frieren");
  console.log(frieren2.results.map(r => r.title));

  console.log("Searching One Piece Egghead...");
  const op = await pahe.search("One Piece Egghead");
  console.log(op.results?.map(r => r.title));
})();
