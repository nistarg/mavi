// Movie type from YouTube API combined with OMDB data
export interface Movie {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string; // ISO 8601 duration
  durationInMinutes: number;
  viewCount: string;
  // OMDB data
  year?: string;
  rated?: string;
  released?: string;
  runtime?: string;
  genre?: string;
  director?: string;
  writer?: string;
  actors?: string;
  plot?: string;
  language?: string;
  country?: string;
  awards?: string;
  poster?: string;
  ratings?: Rating[];
  imdbRating?: string;
  imdbID?: string;
  type?: string;
}

export interface Rating {
  Source: string;
  Value: string;
}

export interface Category {
  id: string;
  title: string;
  movies: Movie[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  isLoading: boolean;
}

export type SearchParams = {
  query: string;
  language?: string;
  genre?: string;
  actor?: string;
  year?: string;
  duration?: number;
};