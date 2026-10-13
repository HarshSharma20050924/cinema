export interface OMDBDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: { Source: string; Value: string }[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
}

const OMDB_API_KEY = "7755307f";
const BASE_URL = "https://www.omdbapi.com";

export const getOMDBDetails = async (
  imdbId?: string,
  title?: string
): Promise<OMDBDetails | null> => {
  try {
    let url = `${BASE_URL}/?apikey=${OMDB_API_KEY}`;
    if (imdbId) {
      url += `&i=${encodeURIComponent(imdbId)}`;
    } else if (title) {
      url += `&t=${encodeURIComponent(title)}`;
    } else {
      return null;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === "True") {
      return data;
    }
    return null;
  } catch (error) {
    console.error("OMDB fetch error:", error);
    return null;
  }
};
