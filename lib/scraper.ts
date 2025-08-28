
import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function scrapeOreilly(query: string): Promise<string[]> {
  try {
    const searchUrl = `https://www.oreillyauto.com/search?q=${encodeURIComponent(query)}`;
    const resp = await fetch(searchUrl);
    const html = await resp.text();
    const $ = cheerio.load(html);
    const links: string[] = [];
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("/detail/") && links.length < 3) {
        links.push("https://www.oreillyauto.com" + href);
      }
    });
    return links;
  } catch (err) {
    return [];
  }
}

export async function scrapeYoutube(query: string): Promise<string[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " car repair tutorial")}`;
    const resp = await fetch(searchUrl);
    const html = await resp.text();
    const $ = cheerio.load(html);
    const links: string[] = [];
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("/watch") && links.length < 3) {
        links.push("https://www.youtube.com" + href);
      }
    });
    return links;
  } catch (err) {
    return [];
  }
}
