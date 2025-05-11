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
const MAX_RETRIES = 10;
const RETRY_DELAY = 1000;

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
  try {
    const cleanTitle = cleanYoutubeTitle(title);
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.Response === 'True' ? data : null;
  } catch {
    return null;
  }
};

export const searchMovies = async (searchTerm: string): Promise<ApiResponse<Movie[]>> => {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const apiKey = await getYoutubeApiKey();
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(searchTerm + ' full movie')}&type=video&videoDuration=long&key=${apiKey}`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const videoIds = data.items.map((item: any) => item.id.videoId).filter(Boolean).join(',');
      if (!videoIds) return { data: [], isLoading: false };

      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`;
      const detailsResponse = await fetch(videoDetailsUrl);
      const detailsData = await detailsResponse.json();
      if (detailsData.error) throw new Error(detailsData.error.message);

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
            thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
            channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
            publishedAt: item.snippet?.publishedAt,
            duration: item.contentDetails?.duration,
            durationInMinutes,
            viewCount: item.statistics?.viewCount || '0',
          });

          movies.push(enriched);
        }
      }
      return { data: movies, isLoading: false };
    } catch (error) {
      retries++;
      if (retries === MAX_RETRIES) return { error: 'Failed to search movies.', isLoading: false };
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
    }
  }
  return { error: 'Search failed.', isLoading: false };
};

export const enrichMovieWithMetadata = async (movie: Movie): Promise<Movie> => {
  try {
    const omdb = await getMovieDetails(movie.title);
    if (!omdb) return movie;

    return {
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
  const randomQuery = queries[Math.floor(Math.random() * queries.length)];
  return await searchMovies(randomQuery);
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
