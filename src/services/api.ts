import { Movie, ApiResponse, SearchParams } from '../types';
import pLimit from 'p-limit';

// All possible YouTube API keys (filter out undefined)
const YOUTUBE_API_KEYS = [
  import.meta.env.VITE_YOUTUBE_API_KEY_1,
  import.meta.env.VITE_YOUTUBE_API_KEY_2,
  import.meta.env.VITE_YOUTUBE_API_KEY_3,
  'AIzaSyBBhGS60rXPxSKf_kjrzW4AuZIMwF3mk3E',
  'AIzaSyC_2QM86c1ZDwrFq5TrDHYw91wuHAAXtu0',
  'AIzaSyDxrMr6aBkVCb91-Kp5ltsumOIbzK6bzN0',
  'AIzaSyDh1B1t8m3bN5fp_FbJ_PCfLbzcImNris0',
  'AIzaSyBkId3Uc_W05YzZO8ztv8yZMuKWb_CYpJw',
  'AIzaSyCvI9LPFjvOe3wOYcsGqhkK-kTJWJSBcKA',
  'AIzaSyDlqTNAKMjsfukzMUYZHRXshPgMYdMTXV4',
  'AIzaSyA9A2t73XXr7Ra9q1SpYcPDvHTozJMwmpE',
  'AIzaSyDfP0C-J3_8k_ynb03RIc-uSUiB_QoDkdI',
  'AIzaSyCS1H46t92_gfqpyQiUWjWyH5d2mvg12E0',
  'AIzaSyBbqxhIKI0LlUEsDl0ujZnthVoMVwpRgiU',
  'AIzaSyD0-vpOkWqckTOBR3_AKVMo9M-qHntjFo',
  'AIzaSyDaYY6Rm2OGnrHae3TmrLcF4KZsKsQ5sDc',
  'AIzaSyAVrjriCZgnN2voGLql5CBAnv18tQ13JIU',
  'AIzaSyAjTFWTp0ddAZ6ZU6tctYeyLMh-YVZyHio',
  'AIzaSyDtjOFaEyO2wsFy2v2adGFM_8NajSW1rtI',
  'AIzaSyAnz1lmkI7azh6pxqZlp6CXmaxsZ76lXDI'
].filter(Boolean);

let currentApiKeyIndex = 0;
const MAX_RETRIES = YOUTUBE_API_KEYS.length * 2;
const RETRY_DELAY = 1000;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

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
    } catch {}
    currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
    if (currentApiKeyIndex === start) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('YouTube API quota exceeded. Please try again later.');
}

function extractMovieTitle(rawTitle: string): string {
  let s = rawTitle
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*{[^}]*}/g, '')
    .trim();

  const [chunk] = s.split(/\s*[-–|:]/).map(c => c.trim());
  let cleaned = chunk
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\b(HD|4K|1080p|720p|BRRip|WEBRip|Full Movie|Movie|Hindi|Punjabi)\b/gi, '')
    .trim();

  return cleaned;
}

function convertToMin(duration: string): number {
  const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = m?.[1] ? parseInt(m[1]) : 0;
  const mins = m?.[2] ? parseInt(m[2]) : 0;
  const secs = m?.[3] ? parseInt(m[3]) : 0;
  return hours * 60 + mins + Math.round(secs / 60);
}

async function getHDThumbnail(videoId: string): Promise<string> {
  const maxres = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  try {
    const response = await fetch(maxres);
    if (response.ok) return maxres;
  } catch {}
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

async function fallbackSearchOMDb(searchTerm: string): Promise<ApiResponse<Movie[]>> {
  try {
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(searchTerm)}&type=movie&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
    const resp = await fetch(url);
    const json: any = await resp.json();
    if (json.Response === 'True' && Array.isArray(json.Search)) {
      const movies: Movie[] = await Promise.all(
        json.Search.map((m: any) => ({
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
        }))
      );
      return { data: movies, isLoading: false };
    }
  } catch (err) {
    console.error('OMDb fallback error:', err);
  }
  return { data: [], isLoading: false };
}

export async function enrichMovieWithMetadata(movie: Movie): Promise<Movie> {
  const cacheKey = `enrich:${normKey(movie.id)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(movie.title)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
    const resp = await fetch(url);
    const omdb = await resp.json();

    if (omdb.Response !== 'True') return movie;

    const thumbnail = movie.videoId ? await getHDThumbnail(movie.videoId) : movie.thumbnail;
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
      poster: omdb.Poster !== 'N/A' ? omdb.Poster : thumbnail,
      thumbnail,
      ratings: omdb.Ratings,
      imdbRating: omdb.imdbRating,
      imdbID: omdb.imdbID,
      type: omdb.Type,
    };

    setInCache(cacheKey, enriched);
    return enriched;
  } catch (err) {
    console.error('Movie enrichment error:', err);
    return movie;
  }
}

export async function searchMovies(searchTerm: string): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `search:${normKey(searchTerm)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const apiKey = await getYoutubeApiKey();
      const sr = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=long&maxResults=10&q=${encodeURIComponent(searchTerm + ' full movie')}&key=${apiKey}`
      );
      const srJson: any = await sr.json();
      if (srJson.error) throw new Error(srJson.error.message);

      const videoIds = srJson.items
        .map((i: any) => i.id.videoId)
        .filter(Boolean)
        .join(',');

      if (!videoIds) return { data: [], isLoading: false };

      const dr = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`
      );
      const drJson: any = await dr.json();
      if (drJson.error) throw new Error(drJson.error.message);

      const limit = pLimit(5);
      const movies = await Promise.all(
        drJson.items
          .filter((v: any) => {
            const mins = convertToMin(v.contentDetails.duration);
            const titleLc = v.snippet.title.toLowerCase();
            return mins >= 60 && !titleLc.includes('trailer') && !titleLc.includes('teaser');
          })
          .map((v: any) =>
            limit(async () => {
              const thumbnail = await getHDThumbnail(v.id);
              return enrichMovieWithMetadata({
                id: v.id,
                videoId: v.id,
                title: extractMovieTitle(v.snippet.title),
                thumbnail,
                channelTitle: v.snippet.channelTitle,
                publishedAt: v.snippet.publishedAt,
                duration: v.contentDetails.duration,
                durationInMinutes: convertToMin(v.contentDetails.duration),
                viewCount: v.statistics.viewCount || '0',
              });
            })
          )
      );

      const result: ApiResponse<Movie[]> = { data: movies, isLoading: false };
      setInCache(cacheKey, result);
      return result;
    } catch (err) {
      console.error('Search error:', err);
      retries++;
      currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }

  console.log('Falling back to OMDb search');
  const fallback = await fallbackSearchOMDb(searchTerm);
  setInCache(cacheKey, fallback);
  return fallback;
}

export const getTrendingMovies = async (): Promise<ApiResponse<Movie[]>> => {
  const trending = await searchMovies('latest bollywood movies 2024');
  if (trending.data.length) return trending;
  const fallbackTitles = [
    'Yeh Jawaani Hai Deewani full movie',
    'Zindagi Na Milegi Dobara full movie',
    'Golmaal full movie',
    'Dil Chahta Hai full movie',
    '3 Idiots full movie',
    'Chennai Express full movie',
  ];
  const results = await Promise.all(fallbackTitles.map(title => searchMovies(title)));
  const movies = results.map(r => r.data[0]).filter((m): m is Movie => !!m);
  return { data: movies, isLoading: false };
};

export function getMoviesByActor(actor: string): Promise<ApiResponse<Movie[]>> {
  return searchMovies(`${actor} best movies`);
}

export function getMoviesByGenre(genre: string): Promise<ApiResponse<Movie[]>> {
  return searchMovies(`best ${genre} bollywood movies`);
}

export async function advancedSearch(params: SearchParams): Promise<ApiResponse<Movie[]>> {
  let query = params.query;
  if (params.actor) query += ` ${params.actor}`;
  if (params.genre) query += ` ${params.genre}`;
  if (params.language) query += ` ${params.language}`;
  if (params.year) query += ` ${params.year}`;

  const res = await searchMovies(query);
  if (params.duration) {
    res.data = res.data.filter(m => m.durationInMinutes >= params.duration);
  }
  return res;
}

/**
 * Fetches movies similar to the given movie ID (via YouTube related videos or OMDb fallback).
 */
export async function getSimilarMovies(id: string): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `similar:${normKey(id)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const apiKey = await getYoutubeApiKey();
    const rel = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${id}&type=video&maxResults=10&key=${apiKey}`
    );
    const relJson: any = await rel.json();
    if (!relJson.error && Array.isArray(relJson.items)) {
      const ids = relJson.items.map((i: any) => i.id.videoId).filter(Boolean).join(',');
      if (ids) {
        const vids = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${ids}&key=${apiKey}`
        );
        const vidsJson: any = await vids.json();
        const movies = await Promise.all(
          vidsJson.items.map(async (v: any) => ({
            id: v.id,
            videoId: v.id,
            title: extractMovieTitle(v.snippet.title),
            thumbnail: await getHDThumbnail(v.id),
            channelTitle: v.snippet.channelTitle,
            publishedAt: v.snippet.publishedAt,
            duration: v.contentDetails.duration,
            durationInMinutes: convertToMin(v.contentDetails.duration),
            viewCount: v.statistics.viewCount || '0',
          }))
        );
        const result = { data: movies, isLoading: false };
        setInCache(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.error('Similar movies error:', err);
  }

  // OMDb keyword fallback
  const enriched = await enrichMovieWithMetadata({ id, videoId: '', title: '', thumbnail: '', channelTitle: '', publishedAt: '', duration: '', durationInMinutes: 0, viewCount: '' });
  const keyword = enriched.genre?.split(',')[0] || enriched.title;
  const fallback = await fallbackSearchOMDb(keyword);
  setInCache(cacheKey, fallback);
  return fallback;
}
