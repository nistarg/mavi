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
const MAX_RETRIES = 10;                 // one retry per key
const RETRY_DELAY = 800;                // ms
const CACHE_DURATION = 1000 * 60 * 60;  // 1h

// In-memory cache
const cache = new Map<string, { data: any; ts: number }>();

const getFromCache = (key: string): any | null => {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const setInCache = (key: string, data: any): void => {
  cache.set(key, { data, ts: Date.now() });
};

const normKey = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function getYoutubeApiKey(): Promise<string> {
  const start = currentApiKeyIndex;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const key = YOUTUBE_API_KEYS[currentApiKeyIndex];
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&q=test&type=video&maxResults=1&key=${key}`
      );
      const json = await res.json();
      if (!json.error) return key;
    } catch {
      // network or parse error: fall through
    }

    currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;

    // if we've looped back around, wait before next rotation
    if (currentApiKeyIndex === start) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('All YouTube API keys exhausted or quota exceeded.');
}

const cleanTitle = (t: string): string =>
  t
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')         // remove brackets
    .replace(/full movie|trailer|teaser|clip/gi, '')
    .replace(/HD|4K|1080p|720p/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

export async function getMovieDetails(title: string): Promise<any> {
  const cacheKey = `omdb:${normKey(title)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const ct = cleanTitle(title);
  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(
    ct
  )}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();

  if (data.Response === 'True') {
    setInCache(cacheKey, data);
    return data;
  }

  // Retry with first 3 words
  const short = ct.split(' ').slice(0, 3).join(' ');
  if (short !== ct) {
    const resp2 = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(
        short
      )}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`
    );
    const data2 = await resp2.json();
    if (data2.Response === 'True') {
      setInCache(cacheKey, data2);
      return data2;
    }
  }

  return null;
}

export async function searchMovies(
  searchTerm: string
): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `search:${normKey(searchTerm)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let retries = 0;
  let lastError = '';

  while (retries < MAX_RETRIES) {
    try {
      const apiKey = await getYoutubeApiKey();

      // 1) Search up to 10 "full movie" videos
      const sr = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=long&maxResults=10&q=${encodeURIComponent(
          searchTerm + ' full movie'
        )}&key=${apiKey}`
      );
      const srJson = await sr.json();
      if (srJson.error) throw new Error(srJson.error.message);

      const videoIds = srJson.items
        .map((i: any) => i.id.videoId)
        .filter(Boolean)
        .join(',');
      if (!videoIds) return { data: [], isLoading: false };

      // 2) Fetch details for those videos
      const dr = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`
      );
      const drJson = await dr.json();
      if (drJson.error) throw new Error(drJson.error.message);

      // 3) Filter + enrich top 5, concurrent limit = 3
      const limit = pLimit(3);
      const movies: Movie[] = await Promise.all(
        drJson.items
          .filter((v: any) => {
            const mins = convertToMin(v.contentDetails.duration);
            const txt = v.snippet.title.toLowerCase();
            return mins >= 60 && !txt.includes('trailer') && !txt.includes('teaser');
          })
          .slice(0, 5)
          .map((v: any) =>
            limit(async () => {
              const base: Movie = {
                id: v.id,
                videoId: v.id,
                title: cleanTitle(v.snippet.title),
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

              const meta = await getMovieDetails(base.title);
              return meta
                ? { ...base, ...mapOmdbToMovie(meta) }
                : base;
            })
          )
      );

      const result = { data: movies, isLoading: false };
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

function convertToMin(duration: string): number {
  const m = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!m) return 0;
  const hours = m[1] ? parseInt(m[1]) : 0;
  const mins = m[2] ? parseInt(m[2]) : 0;
  return hours * 60 + mins;
}

function mapOmdbToMovie(o: any): Partial<Movie> {
  return {
    title: o.Title,
    year: o.Year,
    rated: o.Rated,
    released: o.Released,
    runtime: o.Runtime,
    genre: o.Genre,
    director: o.Director,
    writer: o.Writer,
    actors: o.Actors,
    plot: o.Plot,
    language: o.Language,
    country: o.Country,
    awards: o.Awards,
    poster: o.Poster !== 'N/A' ? o.Poster : undefined,
    ratings: o.Ratings,
    imdbRating: o.imdbRating,
    imdbID: o.imdbID,
    type: o.Type,
  };
}

export const getTrendingMovies = (): Promise<ApiResponse<Movie[]>> =>
  searchMovies('Bollywood full movie');

export const getMoviesByActor = (
  actor: string
): Promise<ApiResponse<Movie[]>> =>
  searchMovies(`${actor} full movie`);

export const getMoviesByGenre = (
  genre: string
): Promise<ApiResponse<Movie[]>> =>
  searchMovies(`${genre} full movie`);

export const advancedSearch = async (
  params: SearchParams
): Promise<ApiResponse<Movie[]>> => {
  let q = params.query;
  [params.actor, params.genre, params.language, params.year]
    .filter(Boolean)
    .forEach((x) => (q += ' ' + x));

  const res = await searchMovies(q);
  if (res.data && params.duration) {
    res.data = res.data.filter(
      (m) => m.durationInMinutes >= params.duration!
    );
  }
  return res;
};
