// src/services/api.ts

import { Movie, ApiResponse, SearchParams } from '../types';
import pLimit from 'p-limit';

const YOUTUBE_API_KEYS = [
  import.meta.env.VITE_YOUTUBE_API_KEY_1,
  import.meta.env.VITE_YOUTUBE_API_KEY_2,
  import.meta.env.VITE_YOUTUBE_API_KEY_3,
  // … your extra hard-coded keys …
'AIzaSyC_2QM86c1ZDwrFq5TrDHYw91wuHAAXtu0',
'AIzaSyDxrMr6aBkVCb91-Kp5ltsumOIbzK6bzN0',
'AIzaSyDh1B1t8m3bN5fp_FbJ_PCfLbzcImNris0',
'AIzaSyBkId3Uc_W05YzZO8ztv8yZMuKWb_CYpJw',
'AIzaSyCvI9LPFjvOe3wOYcsGqhkK-kTJWJSBcKA',
'AIzaSyDlqTNAKMjsfukzMUYZHRXshPgMYdMTXV4',
'AIzaSyA9A2t73XXr7Ra9q1SpYcPDvHTozJMwmpE'
].filter(Boolean) as string[];

let currentApiKeyIndex = 0;
const MAX_RETRIES = 6;
const RETRY_DELAY = 300; // ms
const CACHE_DURATION = 1000 * 60 * 60; // 1h

// Simple in-memory cache
const cache = new Map<string, { data: any; ts: number }>();
function getFromCache(key: string): any | null {
  const e = cache.get(key);
  if (!e || Date.now() - e.ts > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return e.data;
}
function setInCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
}
function normKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Rotate through keys, testing each with a cheap “test” query */
async function getYoutubeApiKey(): Promise<string> {
  const start = currentApiKeyIndex;
  for (let i = 0; i < YOUTUBE_API_KEYS.length; i++) {
    const key = YOUTUBE_API_KEYS[currentApiKeyIndex];
    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        new URLSearchParams({ part: 'id', q: 'a', type: 'video', maxResults: '1', key })
      );
      const json = await resp.json();
      if (!json.error) return key;
    } catch { /* key bad */ }
    currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
    if (currentApiKeyIndex === start) {
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('YouTube API keys exhausted');
}

/** Fast, synchronous title extractor */
function extractMovieTitle(raw: string): string {
  let s = raw
    .replace(/\s*\[[^\]]*]|\s*\([^)]*\)/g, '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\b(HD|4K|1080p|720p|BRRip|WEBRip|BluRay|DVDRip)\b/gi, '')
    .replace(/\b(Official Trailer|Trailer|Teaser|Full Movie)\b/gi, '')
    .trim();

  // Title-Case chunks
  const tc = Array.from(s.matchAll(/\b([A-Z][a-z']+(?:\s+[A-Z][a-z']+)+)\b/g))
    .map(m => m[1]);
  if (tc.length) {
    return tc.reduce((a, b) => a.length >= b.length ? a : b).trim();
  }
  // Fallback: split on separators
  const parts = s.split(/[-–—|:•]/).map(p => p.trim()).filter(Boolean);
  if (parts.length) {
    return parts.reduce((a, b) => a.length >= b.length ? a : b).trim();
  }
  return s;
}

/** Convert ISO8601 YouTube durations to minutes */
function convertToMin(d: string): number {
  const m = d.match(/PT(\d+H)?(\d+M)?/);
  const h = m?.[1] ? parseInt(m[1]) : 0;
  const mm = m?.[2] ? parseInt(m[2]) : 0;
  return h * 60 + mm;
}

/** If YouTube fails, fallback to OMDb “search by title” */
async function fallbackSearchOMDb(q: string): Promise<ApiResponse<Movie[]>> {
  try {
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(q)}&type=movie&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
    const resp = await fetch(url);
    const js = await resp.json();
    if (js.Response === 'True' && Array.isArray(js.Search)) {
      const arr = js.Search.map((m: any): Movie => ({
        id: m.imdbID,
        videoId: '',
        title: m.Title,
        thumbnail: m.Poster !== 'N/A' ? m.Poster : '',
        channelTitle: 'OMDb',
        publishedAt: m.Year,
        duration: '',
        durationInMinutes: 0,
        viewCount: '0',
        year: m.Year,
        imdbID: m.imdbID,
        type: m.Type,
      }));
      return { data: arr, isLoading: false };
    }
  } catch {}
  return { data: [], isLoading: false };
}

export async function enrichMovieWithMetadata(movie: Movie): Promise<Movie> {
  const key = `enrich:${normKey(movie.id)}`;
  const c = getFromCache(key);
  if (c) return c;

  try {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(movie.title)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
    const resp = await fetch(url);
    const js = await resp.json();
    if (js.Response === 'True') {
      const enriched: Movie = {
        ...movie,
        title: js.Title || movie.title,
        year: js.Year,
        rated: js.Rated,
        released: js.Released,
        runtime: js.Runtime,
        genre: js.Genre,
        director: js.Director,
        writer: js.Writer,
        actors: js.Actors,
        plot: js.Plot,
        language: js.Language,
        country: js.Country,
        awards: js.Awards,
        poster: js.Poster !== 'N/A' ? js.Poster : movie.thumbnail,
        ratings: js.Ratings,
        imdbRating: js.imdbRating,
        imdbID: js.imdbID,
        type: js.Type,
      };
      setInCache(key, enriched);
      return enriched;
    }
  } catch {
    /* ignore */
  }
  return movie;
}

export async function searchMovies(searchTerm: string): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `search:${normKey(searchTerm)}`;
  const c = getFromCache(cacheKey);
  if (c) return c;

  // Try raw term first, then “full movie”
  const queries = [searchTerm, `${searchTerm} full movie`];
  let srItems: any[] = [];
  let apiKey = '';

  for (const q of queries) {
    let tries = 0;
    while (tries < MAX_RETRIES) {
      try {
        apiKey = await getYoutubeApiKey();
        const resp = await fetch(
          `https://www.googleapis.com/youtube/v3/search?` +
          new URLSearchParams({
            part: 'snippet',
            type: 'video',
            q,
            maxResults: '8',
            key: apiKey
          })
        );
        const js = await resp.json();
        if (!js.error && Array.isArray(js.items) && js.items.length) {
          srItems = js.items;
          break;
        }
      } catch {}
      tries++;
      currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
    if (srItems.length) break;
  }

  // If no YouTube results, fallback
  if (!srItems.length) {
    const fb = await fallbackSearchOMDb(searchTerm);
    setInCache(cacheKey, fb);
    return fb;
  }

  // Fetch details
  const ids = srItems.map(i => i.id.videoId).filter(Boolean).join(',');
  if (!ids) {
    const fb = await fallbackSearchOMDb(searchTerm);
    setInCache(cacheKey, fb);
    return fb;
  }

  const detailRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?` +
    new URLSearchParams({
      part: 'contentDetails,statistics,snippet',
      id:   ids,
      key:  apiKey
    })
  );
  const detailJs = await detailRes.json();
  if (detailJs.error || !Array.isArray(detailJs.items) || !detailJs.items.length) {
    const fb = await fallbackSearchOMDb(searchTerm);
    setInCache(cacheKey, fb);
    return fb;
  }

  // Build Movie[]
  const limiter = pLimit(6);
  const movies = await Promise.all(
    detailJs.items
      .filter((v: any) => {
        const mins = convertToMin(v.contentDetails.duration);
        const t   = v.snippet.title.toLowerCase();
        return mins >= 60 && !/trailer|teaser/.test(t);
      })
      .map((v: any) =>
        limiter(async () => {
          const title = extractMovieTitle(v.snippet.title);
          return enrichMovieWithMetadata({
            id: v.id,
            videoId: v.id,
            title,
            thumbnail:
              v.snippet.thumbnails.maxres?.url ||
              v.snippet.thumbnails.high?.url   ||
              v.snippet.thumbnails.default?.url,
            channelTitle:      v.snippet.channelTitle,
            publishedAt:       v.snippet.publishedAt,
            duration:          v.contentDetails.duration,
            durationInMinutes: convertToMin(v.contentDetails.duration),
            viewCount:         v.statistics.viewCount || '0',
          });
        })
      )
  );

  const result: ApiResponse<Movie[]> = { data: movies, isLoading: false };
  setInCache(cacheKey, result);
  return result;
}

export const getTrendingMovies = () => searchMovies('Bollywood');
export const getMoviesByActor = (a: string) => searchMovies(a);
export const getMoviesByGenre = (g: string) => searchMovies(g);

export async function advancedSearch(params: SearchParams): Promise<ApiResponse<Movie[]>> {
  let q = params.query;
  [params.actor, params.genre, params.language, params.year]
    .filter(Boolean)
    .forEach(x => q += ' ' + x);
  const res = await searchMovies(q);
  if (res.data && params.duration) {
    res.data = res.data.filter(m => m.durationInMinutes >= params.duration);
  }
  return res;
}
