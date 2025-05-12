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
const MAX_RETRIES = 10;                 // up to 10 retries (one per key)
const RETRY_DELAY = 800;
const CACHE_DURATION = 1000 * 60 * 60;  // 1 hour cache

const cache = new Map<string, { data: any; ts: number }>();

const getFromCache = (key: string) => {
  const e = cache.get(key);
  if (!e || Date.now() - e.ts > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return e.data;
};

const setInCache = (key: string, data: any) => {
  cache.set(key, { data, ts: Date.now() });
};

const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function getYoutubeApiKey(): Promise<string> {
  const start = currentApiKeyIndex;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const key = YOUTUBE_API_KEYS[currentApiKeyIndex];
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&q=test&type=video&maxResults=1&key=${key}`
      );
      const j = await res.json();
      if (!j.error) return key;
    } catch {}
    currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
    if (currentApiKeyIndex === start) {
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('All YouTube API keys exhausted or quota exceeded.');
}

const cleanTitle = (t: string) =>
  t.replace(/\([^)]*\)|\[[^\]]*\]|full movie|HD|4K|Trailer/gi, '')
   .replace(/\s+/g, ' ')
   .trim();

export async function getMovieDetails(title: string): Promise<any> {
  const key = `omdb:${normKey(title)}`;
  const cached = getFromCache(key);
  if (cached) return cached;

  const ct = cleanTitle(title);
  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(ct)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();

  if (data.Response === 'True') {
    setInCache(key, data);
    return data;
  }

  const short = ct.split(' ').slice(0, 3).join(' ');
  if (short !== ct) {
    const r2 = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(short)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`
    );
    const d2 = await r2.json();
    if (d2.Response === 'True') {
      setInCache(key, d2);
      return d2;
    }
  }

  return null;
}

export async function searchMovies(searchTerm: string): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `search:${normKey(searchTerm)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let retries = 0, lastErr = '';
  while (retries < MAX_RETRIES) {
    try {
      const apiKey = await getYoutubeApiKey();
      const sr = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=long&maxResults=10&q=${encodeURIComponent(
          searchTerm + ' full movie'
        )}&key=${apiKey}`
      );
      const { items, error } = await sr.json();
      if (error) throw new Error(error.message);

      const ids = items.map((i: any) => i.id.videoId).join(',');
      if (!ids) return { data: [], isLoading: false };

      const dr = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids}&key=${apiKey}`
      );
      const { items: vids, error: err2 } = await dr.json();
      if (err2) throw new Error(err2.message);

      const limit = pLimit(3);
      const movies = await Promise.all(
        vids
          .filter((v: any) => {
            const m = convertToMin(v.contentDetails.duration);
            const t = v.snippet.title.toLowerCase();
            return m >= 60 && !t.includes('trailer') && !t.includes('teaser');
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
              return meta ? { ...base, ...mapOmdbToMovie(meta) } : base;
            })
          )
      );

      const result = { data: movies, isLoading: false };
      setInCache(cacheKey, result);
      return result;
    } catch (e: any) {
      lastErr = e.message;
      retries++;
      currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
  return { error: lastErr, isLoading: false };
}

function convertToMin(dur: string): number {
  const m = dur.match(/PT(\d+H)?(\d+M)?/);
  if (!m) return 0;
  const h = m[1] ? parseInt(m[1]) : 0;
  const mins = m[2] ? parseInt(m[2]) : 0;
  return h * 60 + mins;
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
    writers: o.Writer,
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

export const getTrendingMovies = () => searchMovies('Bollywood full movie');
export const getMoviesByActor = (actor: string) => searchMovies(`${actor} full movie`);
export const getMoviesByGenre = (genre: string) => searchMovies(`${genre} full movie`);
export const advancedSearch = async (p: SearchParams) => {
  let q = p.query;
  [p.actor, p.genre, p.language, p.year].filter(Boolean).forEach(x => (q += ' ' + x));
  const res = await searchMovies(q);
  if (res.data && p.duration) {
    res.data = res.data.filter(m => m.durationInMinutes >= p.duration);
  }
  return res;
};
