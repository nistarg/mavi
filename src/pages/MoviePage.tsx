import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Clock,
  Star,
  Award,
  Film,
  User,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import VideoPlayer from '../components/player/VideoPlayer'; // adjust path as needed

const MoviePage = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);

  useEffect(() => {
    const fetchMovie = async () => {
      const response = await fetch(`https://api.example.com/movies/${id}`);
      const data = await response.json();
      setMovie(data);
    };

    fetchMovie();
  }, [id]);

  if (!movie) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{movie.title}</h1>
      <div>
        <VideoPlayer videoUrl={movie.videoUrl} />
      </div>
      <div>
        <p>{movie.description}</p>
      </div>
      <div>
        <h3>Details</h3>
        <ul>
          <li>
            <Clock /> {movie.duration}
          </li>
          <li>
            <Star /> {movie.rating}
          </li>
          <li>
            <Award /> {movie.awards}
          </li>
          <li>
            <Film /> {movie.genre}
          </li>
          <li>
            <User /> {movie.director}
          </li>
        </ul>
      </div>
      <div>
        {movie.isBookmarked ? (
          <BookmarkCheck />
        ) : (
          <Bookmark />
        )}
      </div>
    </div>
  );
};

export default MoviePage;
