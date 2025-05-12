import { Movie, ApiResponse, SearchParams } from '../types';
import Fuse from 'fuse.js';

// YouTube API keys (environment + hardcoded fallbacks)
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
const RETRY_DELAY = 1000;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Memory cache for API responses
type CacheItem = { data: any; timestamp: number };
const cache = new Map<string, CacheItem>();

const normalizeCacheKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/gi, '');

const getFromCache = (key: string) => {
  const norm = normalizeCacheKey(key);
  const item = cache.get(norm);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(norm);
    return null;
  }
  return item.data;
};

const setInCache = (key: string, data: any) => {
  const norm = normalizeCacheKey(key);
  cache.set(norm, { data, timestamp: Date.now() });
};

// Rotate through API keys and validate
const getYoutubeApiKey = async (): Promise<string> => {
  const initialIndex = currentApiKeyIndex;
  let attempts = 0;

  while (attempts < YOUTUBE_API_KEYS.length) {
    const key = YOUTUBE_API_KEYS[currentApiKeyIndex];
    try {
      const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=test&type=video&key=${key}`;
      const response = await fetch(testUrl);
      const data = await response.json();
      if (!data.error) return key;
    } catch {}
    currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
    attempts++;
    if (currentApiKeyIndex === initialIndex) await new Promise((r) => setTimeout(r, RETRY_DELAY));
  }
  throw new Error('All YouTube API keys are invalid or quota exceeded.');
};

// Cleanup YouTube titles
title => remove noise
const cleanYoutubeTitle = (title: string): string =>
  title
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/full movie/gi, '')
    .replace(/HD|4K|1080p|720p/gi, '')
    .replace(/official trailer|trailer|teaser|clip|behind the scenes/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

// Better title extraction using description
const extractBetterTitle = (snippet: any): string => {
  const title = snippet.title || '';
  const description = snippet.description || '';
  const candidates: string[] = [];

  // Quoted phrases
  const quoted = description.match(/"([^"]+)"/g) || [];
  quoted.forEach((q) => candidates.push(q.replace(/"/g, '')));

  // Capitalized sequences
  const caps = description.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,4})\b/g);
  if (caps) candidates.push(...caps);

  // Cleaned title fallback
  candidates.push(cleanYoutubeTitle(title));

  return candidates[0] || title;
};

// OMDb metadata fetch
const getOMDbDetails = async (title: string): Promise<any> => {
  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.Response === 'True' ? data : null;
};

// TMDB fallback
const getTMDBDetails = async (title: string): Promise<any> => {
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${import.meta.env.VITE_TMDB_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0] || null;
};

export const getMovieDetails = async (rawTitle: string): Promise<any> => {
  const cacheKey = `movieDetails:${rawTitle}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const title = cleanYoutubeTitle(rawTitle);
  let metadata = await getOMDbDetails(title);
  if (!metadata) metadata = await getTMDBDetails(title);

  // Retry with shorter title
  if (!metadata) {
    const short = title.split(' ').slice(0, 3).join(' ');
    metadata = (await getOMDbDetails(short)) || (await getTMDBDetails(short));
  }

  setInCache(cacheKey, metadata);
  return metadata;
};

export const searchMovies = async (searchTerm: string): Promise<ApiResponse<Movie[]>> => {
  const cacheKey = `search:${searchTerm}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let retries = 0;
  let lastError: string | null = null;

  while (retries < MAX_RETRIES) {
    try {
      const apiKey = await getYoutubeApiKey();
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(
        searchTerm + ' full movie'
      )}&type=video&videoDuration=long&key=${apiKey}`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const videoIds = data.items.map((i: any) => i.id.videoId).filter(Boolean).join(',');
      if (!videoIds) return { data: [], isLoading: false };

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`;
      const detRes = await fetch(detailsUrl);
      const detData = await detRes.json();
      if (detData.error) throw new Error(detData.error.message);

      // Optional Fuse.js setup for future use
      const fuse = new Fuse([], { threshold: 0.3 });

      const movies: Movie[] = await Promise.all(
        detData.items
          .filter((it: any) => {
            const dur = convertDurationToMinutes(it.contentDetails.duration);
            const t = (it.snippet.title || '').toLowerCase();
            return dur >= 60 && !/trailer|teaser|clip|behind/.test(t);
          })
          .map(async (it: any) => {
            const betterTitle = extractBetterTitle(it.snippet);
            const base: Movie = {
              id: it.id,
              videoId: it.id,
              title: it.snippet.title || 'Unknown Title',
              thumbnail:
                it.snippet.thumbnails.maxres?.url ||
                it.snippet.thumbnails.high?.url ||
                it.snippet.thumbnails.default.url,
              channelTitle: it.snippet.channelTitle,
              publishedAt: it.snippet.publishedAt,
              duration: it.contentDetails.duration,
              durationInMinutes: convertDurationToMinutes(it.contentDetails.duration),
              viewCount: it.statistics.viewCount || '0',
            };
            return enrichMovieWithMetadata({ ...base, title: betterTitle });
          })
      );

      const result = { data: await Promise.all(movies), isLoading: false };
      setInCache(cacheKey, result);
      return result;
    } catch (err: any) {
      lastError = err.message;
      retries++;
      currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
      if (retries >= MAX_RETRIES) return { error: lastError, isLoading: false };
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }

  return { error: lastError || 'Search failed', isLoading: false };
};

const convertDurationToMinutes = (duration: string): number => {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(duration) || [];
  const hours = parseInt(match[1] || '0');
  const mins = parseInt(match[2] || '0');
  const secs = parseInt(match[3] || '0');
  return hours * 60 + mins + Math.floor(secs / 60);
};

export const enrichMovieWithMetadata = async (movie: Movie): Promise<Movie> => {
  const cacheKey = `enrich:${movie.id}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const omdb = await getOMDbDetails(movie.title);
    const meta = omdb || (await getTMDBDetails(movie.title));
    if (!meta) return movie;

    const enriched: Movie = {
      ...movie,
      title: meta.Title || meta.title || movie.title,
      year: meta.Year || meta.release_date?.split('-')[0],
      rated: meta.Rated,
      released: meta.Released || meta.release_date,
      runtime: meta.Runtime,
      genre: meta.Genre || meta.genres?.map((g: any) => g.name).join(', '),
      director: meta.Director,
      writer: meta.Writer,
      actors: meta.Actors,
      plot: meta.Plot || meta.overview,
      language: meta.Language,
      country: meta.Country,
      awards: meta.Awards,
      poster: meta.Poster !== 'N/A' ? meta.Poster : movie.thumbnail,
      ratings: meta.Ratings,
      imdbRating: meta.imdbRating,
      imdbID: meta.imdbID || meta.id,
      type: meta.Type || 'movie',
    };

    setInCache(cacheKey, enriched);
    return enriched;
  } catch {
    return movie;
  }
};

export const getTrendingMovies = async (): Promise<ApiResponse<Movie[]>> => {
  const queries = [
    'Bollywood full movie',
    'Punjabi full movie',
    'Shah Rukh Khan full movie',
    'Ranbir Kapoor full movie',
    'Alia Bhatt full movie',
    'Akshay Kumar full movie'
  ];

  for (const q of queries) {
    const res = await searchMovies(q);
    if (!res.error && res.data.length) return res;
  }

  for (const q of queries) {
    const cached = getFromCache(`search:${q}`);
    if (cached && cached.data.length) return cached;
  }

  return { error: 'Unable to fetch trending movies', isLoading: false };
};

export const getMoviesByActor = (actor: string) => searchMovies(`${actor} full movie`);
export const getMoviesByGenre = (genre: string) => searchMovies(`${genre} full movie`);
export const advancedSearch = async (params: SearchParams) => {
  let query = params.query;
  if (params.actor) query += ` ${params.actor}`;
  if (params.genre) query += ` ${params.genre}`;
  if (params.language) query += ` ${params.language}`;
  if (params.year) query += ` ${params.year}`;
  const result = await searchMovies(query);
  if (params.duration) {
    result.data = result.data.filter(m => m.durationInMinutes >= params.duration!);
  }
  return result;
};