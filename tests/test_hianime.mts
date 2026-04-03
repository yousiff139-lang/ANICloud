import { ANIME } from "@consumet/extensions";

async function test() {
  const provider = new ANIME.Hianime();
  
  console.log("Searching for Dr. Stone...");
  try {
    const searchResults = await provider.search("Dr. Stone");
    if (!searchResults.results.length) {
      console.error("No results found.");
      return;
    }
    
    const animeId = searchResults.results[0].id;
    console.log("Found anime ID:", animeId);
    
    const animeInfo = await provider.fetchAnimeInfo(animeId);
    console.log("Episodes available:", animeInfo.episodes?.length);
    
    const ep1 = animeInfo.episodes?.find((e: any) => e.number === 1);
    if (!ep1) {
      console.error("Episode 1 not found");
      return;
    }
    
    console.log("Fetching sources for Episode 1 ID:", ep1.id);
    const sources = await provider.fetchEpisodeSources(ep1.id);
    
    console.log("Sources success, quality found:", sources.sources.map(s => s.quality));
  } catch(e) {
    console.error("Error with Hianime:", e);
  }
}

test().catch(console.error);
