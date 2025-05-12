import { Movie, ApiResponse, SearchParams } from '../types';

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
const MAX_RETRIES = 10; // Increased to match number of API keys
const RETRY_DELAY = 1000;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

const cache = new Map<string, { data: any; timestamp: number }>();

const getFromCache = (key: string) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const setInCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

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
    if (currentApiKeyIndex === initialIndex) await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
  }
  throw new Error('All YouTube API keys are invalid or quota exceeded.');
};

const convertDurationToMinutes = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  return hours * 60 + minutes + Math.floor(seconds / 60);
};

const cleanYoutubeTitle = (title: string): string => {
  return title
    .replace(/full movie/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\d{4}/g, '')
    .replace(/HD|4K|1080p|720p/gi, '')
    .replace(/official trailer/gi, '')
    .replace(/trailer/gi, '')
    .replace(/clip/gi, '')
    .replace(/teaser/gi, '')
    .replace(/behind the scenes/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getMovieDetails = async (title: string): Promise<any> => {
  const cacheKey = `omdb:${title}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const cleanTitle = cleanYoutubeTitle(title);
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const result = data.Response === 'True' ? data : null;
    if (result) setInCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
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

      const movies: Movie[] = [];

      for (const item of detailsData.items || []) {
        const durationInMinutes = convertDurationToMinutes(item.contentDetails?.duration);
        const title = item.snippet?.title?.toLowerCase() || '';

        if (durationInMinutes >= 60 &&
            !title.includes('trailer') &&
            !title.includes('clip') &&
            !title.includes('teaser') &&
            !title.includes('behind the scenes')) {

          const enriched = await enrichMovieWithMetadata({
            id: item.id,
            videoId: item.id,
            title: item.snippet?.title || 'Unknown Title',
            thumbnail: item.snippet?.thumbnails?.maxres?.url || 
                      item.snippet?.thumbnails?.high?.url || 
                      item.snippet?.thumbnails?.default?.url,
            channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
            publishedAt: item.snippet?.publishedAt,
            duration: item.contentDetails?.duration,
            durationInMinutes,
            viewCount: item.statistics?.viewCount || '0',
          });

          movies.push(enriched);
        }
      }

      const result = { data: movies, isLoading: false };
      setInCache(cacheKey, result);
      return result;
    } catch (error) {
      retries++;
      currentApiKeyIndex = (currentApiKeyIndex + 1) % YOUTUBE_API_KEYS.length;
      
      if (retries === MAX_RETRIES) {
        const errorMessage = lastError || 'Failed to search movies. Please check your API configuration.';
        console.error(`Search failed after ${MAX_RETRIES} retries. Last error: ${errorMessage}`);
        return { 
          error: errorMessage, 
          isLoading: false 
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  return { 
    error: lastError || 'Search failed after maximum retries.', 
    isLoading: false 
  };
};

export const enrichMovieWithMetadata = async (movie: Movie): Promise<Movie> => {
  const cacheKey = `enrich:${movie.id}`;
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

  // Try each query until we get a successful response
  for (const query of queries) {
    const result = await searchMovies(query);
    if (!result.error && result.data && result.data.length > 0) {
      return result;
    }
  }

  // If all queries fail, check if we have any cached results
  for (const query of queries) {
    const cached = getFromCache(`search:${query}`);
    if (cached && cached.data && cached.data.length > 0) {
      console.log('Using cached results due to API failure');
      return cached;
    }
  }

  // If everything fails, return a more descriptive error
  return {
    error: 'Unable to fetch trending movies. Please check your YouTube API configuration or try again later.',
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