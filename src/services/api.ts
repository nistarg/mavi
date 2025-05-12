// src/services/api.ts

import { Movie, ApiResponse, SearchParams } from '../types';
import pLimit from 'p-limit';

const YOUTUBE_API_KEYS = [
  import.meta.env.VITE_YOUTUBE_API_KEY_1,
  import.meta.env.VITE_YOUTUBE_API_KEY_2,
  import.meta.env.VITE_YOUTUBE_API_KEY_3,
  'AIzaSyDlqTNAKMjsfukzMUYZHRXshPgMYdMTXV4',
  'AIzaSyC_2QM86c1ZDwrFq5TrDHYw91wuHAAXtu0',
  'AIzaSyDxrMr6aBkVCb91-Kp5ltsumOIbzK6bzN0',
  'AIzaSyDh1B1t8m3bN5fp_FbJ_PCfLbzcImNris0',
  'AIzaSyBkId3Uc_W05YzZO8ztv8yZMuKWb_CYpJw',
  'AIzaSyCvI9LPFjvOe3wOYcsGqhkK-kTJWJSBcKA',
  'AIzaSyA9A2t73XXr7Ra9q1SpYcPDvHTozJMwmpE'
].filter(Boolean);

let currentApiKeyIndex = 0;
const MAX_RETRIES = 10;
const RETRY_DELAY = 800;                // ms
const CACHE_DURATION = 1000 * 60 * 60;  // 1h

// In‐memory cache
const cache = new Map<string, { data: any; ts: number }>();

function getFromCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache(key: string, data: any): void {
  cache.set(key, { data, ts: Date.now() });
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Try each YouTube key up to MAX_RETRIES times before failing */
async function getYoutubeApiKey(): Promise<string> {
  const start = currentApiKeyIndex;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const key = YOUTUBE_API_KEYS[currentApiKeyIndex];
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&q=test&type=video&maxResults=1&key=${key}`
      );
      const json: any = await res.json();
      if (!json.error) return key;
    } catch {
      // ignore network errors
    }
    currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
    if (currentApiKeyIndex === start) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('All YouTube API keys exhausted or quota exceeded.');
}

/**
 * Extracts the core movie title from a messy YouTube video title.
 */
function extractMovieTitle(rawTitle: string): string {
  // 1) Remove bracketed text
  let s = rawTitle.replace(/\s*\[[^\]]*\]|\s*\([^)]*\)/g, '').trim();
  // 2) Split on delimiters and take first piece
  const [chunk] = s.split(/[-–|:]/).map((c) => c.trim());
  // 3) Remove year markers
  let cleaned = chunk.replace(/\b(19|20)\d{2}\b/g, '').trim();
  // 4) Remove quality tags
  cleaned = cleaned.replace(/\b(HD|4K|1080p|720p|BRRip|WEBRip)\b/gi, '').trim();
  // 5) Cut off at keywords
  cleaned = cleaned.split(/\b(Official Trailer|Trailer|Teaser|Full Movie)\b/i)[0].trim();
  // 6) Pick the longest Title-Case run
  const runs = cleaned.match(/(?:[A-Z][a-z']+(?:\s|$))+?/g) || [];
  return (runs.sort((a, b) => b.length - a.length)[0] || cleaned).trim();
}

/** Fetch full metadata from OMDb **/
export async function getMovieDetails(title: string): Promise<any> {
  const cacheKey = `omdb:${normKey(title)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const clean = extractMovieTitle(title);
  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(clean)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
  const resp = await fetch(url);
  const data: any = await resp.json();
  if (data.Response === 'True') {
    setInCache(cacheKey, data);
    return data;
  }

  // Retry with first 3 words
  const short = clean.split(' ').slice(0, 3).join(' ');
  if (short !== clean) {
    const resp2 = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(short)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`
    );
    const data2: any = await resp2.json();
    if (data2.Response === 'True') {
      setInCache(cacheKey, data2);
      return data2;
    }
  }
  return null;
}

/** Enrich a base Movie with OMDb metadata */
export async function enrichMovieWithMetadata(movie: Movie): Promise<Movie> {
  const cacheKey = `enrich:${normKey(movie.id)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const omdb = await getMovieDetails(movie.title);
    if (!omdb) return movie;

    const enriched: Movie = {
      ...movie,
      title: omdb.Title || movie.title,
      year: omdb.Year,
      rated: omdb.Rated,
      released: omdb.Released,
      runtime: omdb.Runtime,
      genre: omdb.Genre,
      director: omdb.Director,
      writer: omdb.Writer,
      actors: omdb.Actors,
      plot: omdb.Plot,
      language: omdb.Language,
      country: omdb.Country,
      awards: omdb.Awards,
      poster: omdb.Poster !== 'N/A' ? omdb.Poster : movie.thumbnail,
      ratings: omdb.Ratings,
      imdbRating: omdb.imdbRating,
      imdbID: omdb.imdbID,
      type: omdb.Type,
    };

    setInCache(cacheKey, enriched);
    return enriched;
  } catch {
    return movie;
  }
}

/** Main search: YouTube → filter → enrich with OMDb */
export async function searchMovies(searchTerm: string): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `search:${normKey(searchTerm)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let retries = 0, lastError = '';
  while (retries < MAX_RETRIES) {
    try {
      const apiKey = await getYoutubeApiKey();

      // 1) Search YouTube for "full movie"
      const sr = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=long&maxResults=10&q=${encodeURIComponent(
          searchTerm + ' full movie'
        )}&key=${apiKey}`
      );
      const srJson: any = await sr.json();
      if (srJson.error) throw new Error(srJson.error.message);

      const videoIds = srJson.items.map((i: any) => i.id.videoId).filter(Boolean).join(',');
      if (!videoIds) return { data: [], isLoading: false };

      // 2) Fetch video details
      const dr = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`
      );
      const drJson: any = await dr.json();
      if (drJson.error) throw new Error(drJson.error.message);

      // 3) Filter & enrich top 5
      const limit = pLimit(3);
      const movies = await Promise.all<Movie>(
        drJson.items
          .filter((v: any) => {
            const mins = convertToMin(v.contentDetails.duration);
            const titleLc = v.snippet.title.toLowerCase();
            return mins >= 60 && !titleLc.includes('trailer') && !titleLc.includes('teaser');
          })
          .slice(0, 5)
          .map((v: any) =>
            limit(async () => {
              const extracted = extractMovieTitle(v.snippet.title);
              const base: Movie = {
                id: v.id,
                videoId: v.id,
                title: extracted,
                thumbnail:
                  v.snippet.thumbnails.maxres?.url ||
                  v.snippet.thumbnails.high?.url ||
                  v.snippet.thumbnails.default?.url,
                channelTitle: v.snippet.channelTitle,
                publishedAt: v.snippet.publishedAt,
                duration: v.contentDetails.duration,
                durationInMinutes: convertToMin(v.contentDetails.duration),
                viewCount: v.statistics.viewCount || '0',
              };
              return enrichMovieWithMetadata(base);
            })
          )
      );

      const result: ApiResponse<Movie[]> = { data: movies, isLoading: false };
      setInCache(cacheKey, result);
      return result;
    } catch (err: any) {
      lastError = err.message;
      retries++;
      currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }

  return { error: lastError, isLoading: false };
}

/** Helpers */
function convertToMin(duration: string): number {
  const m = duration.match(/PT(\d+H)?(\d+M)?/);
  const hours = m && m[1] ? parseInt(m[1]) : 0;
  const mins = m && m[2] ? parseInt(m[2]) : 0;
  return hours * 60 + mins;
}

/** Exports */
export const getTrendingMovies = (): Promise<ApiResponse<Movie[]>> =>
  searchMovies('Bollywood full movie');

export const getMoviesByActor = (actor: string): Promise<ApiResponse<Movie[]>> =>
  searchMovies(`${actor} full movie`);

export const getMoviesByGenre = (genre: string): Promise<ApiResponse<Movie[]>> =>
  searchMovies(`${genre} full movie`);

export async function advancedSearch(
  params: SearchParams
): Promise<ApiResponse<Movie[]>> {
  let q = params.query;
  [params.actor, params.genre, params.language, params.year].filter(Boolean).forEach(x => (q += ' ' + x));
  const res = await searchMovies(q);
  if (res.data && params.duration) {
    res.data = res.data.filter(m => m.durationInMinutes >= params.duration!);
  }
  return res;
}
