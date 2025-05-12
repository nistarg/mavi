import { Movie, ApiResponse, SearchParams } from '../types';
import Fuse from 'fuse.js';

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

const cache = new Map<string, { data: any; timestamp: number }>();

const getFromCache = (key: string) => {
  const item = cache.get(key);
  if (!item || Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const setInCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const normalizeCacheKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/gi, '');

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
    if (currentApiKeyIndex === initialIndex) {
      await new Promise(res => setTimeout(res, RETRY_DELAY));
    }
  }
  throw new Error('All YouTube API keys are invalid or quota exceeded.');
};

const cleanYoutubeTitle = (title: string): string => {
  return title
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/full movie/gi, '')
    .replace(/HD|4K|1080p|720p/gi, '')
    .replace(/official trailer|trailer|teaser|clip|behind the scenes/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractBetterTitle = (snippet: any): string => {
  const title = snippet?.title || '';
  const description = snippet?.description || '';
  const possibleTitles = [];

  const quoted = description.match(/"([^"]+)"/g);
  if (quoted) {
    possibleTitles.push(...quoted.map(q => q.replace(/"/g, '')));
  }

  const capsMatch = description.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,4})\b/g);
  if (capsMatch) {
    possibleTitles.push(...capsMatch);
  }

  possibleTitles.push(cleanYoutubeTitle(title));

  return possibleTitles[0] || title;
};

const getTMDBDetails = async (title: string): Promise<any> => {
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${import.meta.env.VITE_TMDB_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  return data?.results?.[0] || null;
};

export const getMovieDetails = async (title: string): Promise<any> => {
  const cacheKey = `omdb:${normalizeCacheKey(title)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const cleanTitle = cleanYoutubeTitle(title);
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      setInCache(cacheKey, data);
      return data;
    }

    const shortTitle = cleanTitle.split(' ').slice(0, 3).join(' ');
    if (shortTitle !== cleanTitle) {
      const shortUrl = `https://www.omdbapi.com/?t=${encodeURIComponent(shortTitle)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
      const shortResponse = await fetch(shortUrl);
      const shortData = await shortResponse.json();

      if (shortData.Response === 'True') {
        setInCache(cacheKey, shortData);
        return shortData;
      }
    }

    // Try TMDB as a fallback
    const tmdb = await getTMDBDetails(cleanTitle);
    if (tmdb) {
      setInCache(cacheKey, tmdb);
      return tmdb;
    }

    return null;
  } catch {
    return null;
  }
};

export const searchMovies = async (searchTerm: string): Promise<ApiResponse<Movie[]>> => {
  const cacheKey = `search:${normalizeCacheKey(searchTerm)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let retries = 0;
  let lastError: string | null = null;

  while (retries < MAX_RETRIES) {
    try {
      const apiKey = await getYoutubeApiKey();
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(searchTerm + ' full movie')}&type=video&videoDuration=long&key=${apiKey}`;
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (data.error) {
        lastError = data.error.message;
        throw new Error(data.error.message);
      }

      const videoIds = data.items.map((item: any) => item.id.videoId).filter(Boolean).join(',');
      if (!videoIds) return { data: [], isLoading: false };

      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`;
      const detailsResponse = await fetch(videoDetailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        lastError = detailsData.error.message;
        throw new Error(detailsData.error.message);
      }

      const enrichmentPromises: Promise<Movie>[] = [];

      for (const item of detailsData.items || []) {
        const durationInMinutes = convertDurationToMinutes(item.contentDetails?.duration);
        const rawTitle = extractBetterTitle(item.snippet);

        if (
          durationInMinutes >= 60 &&
          !rawTitle.toLowerCase().includes('trailer') &&
          !rawTitle.toLowerCase().includes('teaser')
        ) {
          const movie: Movie = {
            id: item.id,
            videoId: item.id,
            title: rawTitle,
            thumbnail: item.snippet?.thumbnails?.maxres?.url ||
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.default?.url,
            channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
            publishedAt: item.snippet?.publishedAt,
            duration: item.contentDetails?.duration,
            durationInMinutes,
            viewCount: item.statistics?.viewCount || '0',
          };

          enrichmentPromises.push(enrichMovieWithMetadata(movie));
        }
      }

      const enrichedMovies = await Promise.all(enrichmentPromises);
      const result = { data: enrichedMovies, isLoading: false };
      setInCache(cacheKey, result);
      return result;
    } catch (error) {
      retries++;
      currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;

      if (retries === MAX_RETRIES) {
        console.error(`Search failed after ${MAX_RETRIES} retries. Last error: ${lastError}`);
        return { error: lastError || 'Search failed.', isLoading: false };
      }

      await new Promise(res => setTimeout(res, RETRY_DELAY));
    }
  }

  return { error: lastError || 'Search failed.', isLoading: false };
};

const convertDurationToMinutes = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  return hours * 60 + minutes + Math.floor(seconds / 60);
};

export const enrichMovieWithMetadata = async (movie: Movie): Promise<Movie> => {
  const cacheKey = `enrich:${normalizeCacheKey(movie.id)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const omdb = await getMovieDetails(movie.title);
    if (!omdb) return movie;

    const enriched = {
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

  for (const query of queries) {
    const result = await searchMovies(query);
    if (!result.error && result.data.length > 0) return result;
  }

  for (const query of queries) {
    const cached = getFromCache(`search:${normalizeCacheKey(query)}`);
    if (cached && cached.data.length > 0) return cached;
  }

  return {
    error: 'Unable to fetch trending movies. Please try again later.',
    isLoading: false
  };
};

export const getMoviesByActor = async (actor: string): Promise<ApiResponse<Movie[]>> => {
  return await searchMovies(`${actor} full movie`);
};

export const getMoviesByGenre = async (genre: string): Promise<ApiResponse<Movie[]>> => {
  return await searchMovies(`${genre} Bollywood full movie`);
};

export const advancedSearch = async (params: SearchParams): Promise<ApiResponse<Movie[]>> => {
  let query = params.query;
  if (params.actor) query += ` ${params.actor}`;
  if (params.genre) query += ` ${params.genre}`;
  if (params.language) query += ` ${params.language}`;
  if (params.year) query += ` ${params.year}`;
  const results = await searchMovies(query);
  if (results.data && params.duration) {
    results.data = results.data.filter(movie => movie.durationInMinutes >= params.duration);
  }
  return results;
};
