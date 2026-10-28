import { IMDB_RANKINGS, LETTERBOXD_RANKINGS } from "./rankingsData";
import type { Post } from "../types";

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_W500 = "https://image.tmdb.org/t/p/w500";

export const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

// Helper to convert RankedItem to standard Post
export function rankedToPost(r: any): Post {
  const genresStr = Array.isArray(r.genres)
    ? r.genres.join(", ")
    : r.genres || r.category || "";
  return {
    title: r.title,
    year: r.year ? String(r.year) : "",
    image: r.poster || "",
    rating: r.imdbRating ? String(r.imdbRating) : r.letterboxdRating ? String(r.letterboxdRating) : undefined,
    link: `/search?q=${encodeURIComponent(r.title)}`,
    backdropUrl: r.backdrop || undefined,
    genres: genresStr,
    overview: r.overview || undefined,
    description: r.overview || undefined,
    tmdbId: r.tmdbId,
    mediaType: r.type || "movie",
  };
}

export interface HomeShelf {
  id: string;
  title: string;
  items: Post[];
  layout?: "portrait" | "landscape";
}

// 1. Best Picture Winners
const BEST_PICTURE_WINNERS: Post[] = [
  {
    title: "Oppenheimer",
    year: "2023",
    image: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    rating: "8.9",
    link: "/search?q=Oppenheimer",
  },
  {
    title: "Everything Everywhere All at Once",
    year: "2022",
    image: "https://m.media-amazon.com/images/M/MV5BOWNmMzAzZmQtNDQ1NC00Nzk5LTkyMmUtNGI2N2NkOWM4MzEyXkEyXkFqcGc@._V1_SX250.jpg",
    rating: "8.8",
    link: "/search?q=Everything+Everywhere+All+at+Once",
  },
  {
    title: "CODA",
    year: "2021",
    image: "https://m.media-amazon.com/images/M/MV5BNzIzOTNjOTQtM2QzOC00NjFlLTljZDUtZmI4Yjg1YTkyMTBiXkEyXkFqcGc@._V1_SX250.jpg",
    rating: "8.0",
    link: "/search?q=CODA",
  },
  {
    title: "Parasite",
    year: "2019",
    image: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    rating: "8.5",
    link: "/search?q=Parasite",
  },
  {
    title: "Green Book",
    year: "2018",
    image: "https://m.media-amazon.com/images/M/MV5BNDU5YTNmMmItN2QxNy00OGQ0LTg5MTctNzFmYjEzZjcwN2UwXkEyXkFqcGc@._V1_SX250.jpg",
    rating: "8.2",
    link: "/search?q=Green+Book",
  },
  {
    title: "The Shape of Water",
    year: "2017",
    image: "https://image.tmdb.org/t/p/w500/9zfwPffUXpBrEP26yp0q1ckXDcj.jpg",
    rating: "7.3",
    link: "/search?q=The+Shape+of+Water",
  },
  {
    title: "Moonlight",
    year: "2016",
    image: "https://image.tmdb.org/t/p/w500/4911T5FbJ9eD2Faz5Z8cT3SUhU3.jpg",
    rating: "7.4",
    link: "/search?q=Moonlight",
  },
  {
    title: "Spotlight",
    year: "2015",
    image: "https://m.media-amazon.com/images/M/MV5BMjIyOTM5OTIzNV5BMl5BanBnXkFtZTgwMDkzODE2NjE@._V1_SX250.jpg",
    rating: "8.1",
    link: "/search?q=Spotlight",
  },
  {
    title: "Birdman",
    year: "2014",
    image: "https://image.tmdb.org/t/p/w500/tBVSDa48aOcq7vF0xLFprRWZgbh.jpg",
    rating: "7.7",
    link: "/search?q=Birdman",
  },
  {
    title: "12 Years a Slave",
    year: "2013",
    image: "https://image.tmdb.org/t/p/w500/xdANQijuNrJaw1HA61rDccME4Tm.jpg",
    rating: "8.1",
    link: "/search?q=12+Years+a+Slave",
  },
  {
    title: "The King's Speech",
    year: "2010",
    image: "https://image.tmdb.org/t/p/w500/pVNKXVQFukBaCz6ML7GH3kiPlQP.jpg",
    rating: "8.0",
    link: "/search?q=The+Kings+Speech",
  },
  {
    title: "No Country for Old Men",
    year: "2007",
    image: "https://image.tmdb.org/t/p/w500/6d5XOczc226jECq0LIX0siKtgHR.jpg",
    rating: "8.2",
    link: "/search?q=No+Country+for+Old+Men",
  },
  {
    title: "The Departed",
    year: "2006",
    image: "https://image.tmdb.org/t/p/w500/nT97ifVT2J1yMQmeq20Qblg61T.jpg",
    rating: "8.5",
    link: "/search?q=The+Departed",
  },
  {
    title: "Gladiator",
    year: "2000",
    image: "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    rating: "8.5",
    link: "/search?q=Gladiator",
  },
  {
    title: "Schindler's List",
    year: "1993",
    image: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
    rating: "9.0",
    link: "/search?q=Schindlers+List",
  },
  {
    title: "The Silence of the Lambs",
    year: "1991",
    image: "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg",
    rating: "8.6",
    link: "/search?q=The+Silence+of+the+Lambs",
  },
];

// 2. Emmy Award Winners
const EMMY_AWARD_WINNERS: Post[] = [
  {
    title: "Succession",
    year: "2018",
    image: "https://image.tmdb.org/t/p/w500/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg",
    rating: "8.9",
    link: "/search?q=Succession",
  },
  {
    title: "The Bear",
    year: "2022",
    image: "https://image.tmdb.org/t/p/w500/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg",
    rating: "8.6",
    link: "/search?q=The+Bear",
  },
  {
    title: "Beef",
    year: "2023",
    image: "https://image.tmdb.org/t/p/w500/25ih0Xq2zWbxhhKxwhvswKYQyEr.jpg",
    rating: "8.0",
    link: "/search?q=Beef",
  },
  {
    title: "Hacks",
    year: "2021",
    image: "https://image.tmdb.org/t/p/w500/ca5XiEFgyGsI38QT3wEKa1QVGX.jpg",
    rating: "8.2",
    link: "/search?q=Hacks",
  },
  {
    title: "Ted Lasso",
    year: "2020",
    image: "https://image.tmdb.org/t/p/w500/uRHsiw1wLxPHFXkkv4Ix1s0O6f4.jpg",
    rating: "8.8",
    link: "/search?q=Ted+Lasso",
  },
  {
    title: "The White Lotus",
    year: "2021",
    image: "https://image.tmdb.org/t/p/w500/gbSaK9v1CbcYH1ISgbM7XObD2dW.jpg",
    rating: "8.0",
    link: "/search?q=The+White+Lotus",
  },
  {
    title: "Chernobyl",
    year: "2019",
    image: "https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    rating: "9.4",
    link: "/search?q=Chernobyl",
  },
  {
    title: "Breaking Bad",
    year: "2008",
    image: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    rating: "9.5",
    link: "/search?q=Breaking+Bad",
  },
  {
    title: "The Sopranos",
    year: "1999",
    image: "https://image.tmdb.org/t/p/w500/rTc7ZXdroqjkKivFPvCPX0Ru7uw.jpg",
    rating: "9.2",
    link: "/search?q=The+Sopranos",
  },
  {
    title: "Fleabag",
    year: "2016",
    image: "https://image.tmdb.org/t/p/w500/vFn0nLPcIggPH5LTWWaJ2hcsGlc.jpg",
    rating: "8.7",
    link: "/search?q=Fleabag",
  },
  {
    title: "Mad Men",
    year: "2007",
    image: "https://image.tmdb.org/t/p/w500/5jOedTeytYzlJZwU66MFjmLHhHX.jpg",
    rating: "8.7",
    link: "/search?q=Mad+Men",
  },
  {
    title: "The Wire",
    year: "2002",
    image: "https://image.tmdb.org/t/p/w500/4lbclFySvugI51fwsyxBTOm4DqK.jpg",
    rating: "9.3",
    link: "/search?q=The+Wire",
  },
];

// 3. Box Office Hits
const BOX_OFFICE_HITS: Post[] = [
  {
    title: "Avatar: The Way of Water",
    year: "2022",
    image: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    rating: "7.6",
    link: "/search?q=Avatar+The+Way+of+Water",
  },
  {
    title: "Top Gun: Maverick",
    year: "2022",
    image: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
    rating: "8.3",
    link: "/search?q=Top+Gun+Maverick",
  },
  {
    title: "Spider-Man: No Way Home",
    year: "2021",
    image: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
    rating: "8.2",
    link: "/search?q=Spider-Man+No+Way+Home",
  },
  {
    title: "Barbie",
    year: "2023",
    image: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
    rating: "7.0",
    link: "/search?q=Barbie",
  },
  {
    title: "Avengers: Endgame",
    year: "2019",
    image: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    rating: "8.4",
    link: "/search?q=Avengers+Endgame",
  },
  {
    title: "The Lion King",
    year: "2019",
    image: "https://image.tmdb.org/t/p/w500/dzBtMocZuJbjLOXvrl4zGYigDzh.jpg",
    rating: "7.0",
    link: "/search?q=The+Lion+King",
  },
  {
    title: "Jurassic World",
    year: "2015",
    image: "https://image.tmdb.org/t/p/w500/1RICxzeoNCAO5NpcRMIgg1XT6fm.jpg",
    rating: "7.0",
    link: "/search?q=Jurassic+World",
  },
  {
    title: "Titanic",
    year: "1997",
    image: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
    rating: "7.9",
    link: "/search?q=Titanic",
  },
  {
    title: "The Avengers",
    year: "2012",
    image: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
    rating: "8.0",
    link: "/search?q=The+Avengers",
  },
  {
    title: "The Dark Knight",
    year: "2008",
    image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    rating: "9.0",
    link: "/search?q=The+Dark+Knight",
  },
];

// 4. Psychological Thrillers
const PSYCHOLOGICAL_THRILLERS: Post[] = [
  {
    title: "The Silence of the Lambs",
    year: "1991",
    image: "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg",
    rating: "8.6",
    link: "/search?q=The+Silence+of+the+Lambs",
  },
  {
    title: "Se7en",
    year: "1995",
    image: "https://image.tmdb.org/t/p/w500/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg",
    rating: "8.6",
    link: "/search?q=Se7en",
  },
  {
    title: "Shutter Island",
    year: "2010",
    image: "https://image.tmdb.org/t/p/w500/nrmXQ0zcZUL8jFLrakWc90IR8z9.jpg",
    rating: "8.2",
    link: "/search?q=Shutter+Island",
  },
  {
    title: "Fight Club",
    year: "1999",
    image: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    rating: "8.8",
    link: "/search?q=Fight+Club",
  },
  {
    title: "Gone Girl",
    year: "2014",
    image: "https://image.tmdb.org/t/p/w500/ts996lKsxvjkO2yiYG0ht4qAicO.jpg",
    rating: "8.1",
    link: "/search?q=Gone+Girl",
  },
  {
    title: "Black Swan",
    year: "2010",
    image: "https://image.tmdb.org/t/p/w500/viWheBd44bouiLCHgNMvahLThqx.jpg",
    rating: "8.0",
    link: "/search?q=Black+Swan",
  },
  {
    title: "Zodiac",
    year: "2007",
    image: "https://image.tmdb.org/t/p/w500/6YmeO4pB7XTh8P8F960O1uA14JO.jpg",
    rating: "7.7",
    link: "/search?q=Zodiac",
  },
  {
    title: "Prisoners",
    year: "2013",
    image: "https://image.tmdb.org/t/p/w500/uhviyknTT5cEQXbn6vWIqfM4vGm.jpg",
    rating: "8.1",
    link: "/search?q=Prisoners",
  },
  {
    title: "Memento",
    year: "2000",
    image: "https://image.tmdb.org/t/p/w500/nzlv62aC0octS5AklAiWpXLX9Z0.jpg",
    rating: "8.4",
    link: "/search?q=Memento",
  },
  {
    title: "The Prestige",
    year: "2006",
    image: "https://image.tmdb.org/t/p/w500/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg",
    rating: "8.5",
    link: "/search?q=The+Prestige",
  },
];

// 5. Palme d'Or Winners
const PALME_DOR_WINNERS: Post[] = [
  {
    title: "Anora",
    year: "2024",
    image: "https://image.tmdb.org/t/p/w500/cgXk2tNYhJZLXdBDO5DidAVzQ82.jpg",
    rating: "8.0",
    link: "/search?q=Anora",
  },
  {
    title: "Anatomy of a Fall",
    year: "2023",
    image: "https://image.tmdb.org/t/p/w500/1ho0d4LNZw3Y0voeKmSvPSgJOJ2.jpg",
    rating: "7.8",
    link: "/search?q=Anatomy+of+a+Fall",
  },
  {
    title: "Triangle of Sadness",
    year: "2022",
    image: "https://image.tmdb.org/t/p/w500/k9eLozCgCed5FGTSdHu0bBElAV8.jpg",
    rating: "7.4",
    link: "/search?q=Triangle+of+Sadness",
  },
  {
    title: "Titane",
    year: "2021",
    image: "https://image.tmdb.org/t/p/w500/mBlpouG3gqB8WLdP65LCOXb3jFb.jpg",
    rating: "6.6",
    link: "/search?q=Titane",
  },
  {
    title: "Parasite",
    year: "2019",
    image: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    rating: "8.5",
    link: "/search?q=Parasite",
  },
  {
    title: "Shoplifters",
    year: "2018",
    image: "https://image.tmdb.org/t/p/w500/4nfRUOv3LX5zLn98WS1WqVBk9E9.jpg",
    rating: "7.9",
    link: "/search?q=Shoplifters",
  },
  {
    title: "The Square",
    year: "2017",
    image: "https://image.tmdb.org/t/p/w500/pefcv5VNspSK4Dt8doei5bJmmln.jpg",
    rating: "7.2",
    link: "/search?q=The+Square",
  },
  {
    title: "Pulp Fiction",
    year: "1994",
    image: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    rating: "8.9",
    link: "/search?q=Pulp+Fiction",
  },
  {
    title: "Taxi Driver",
    year: "1976",
    image: "https://image.tmdb.org/t/p/w500/ekstpH614fwDX8DUln1a2Opz0N8.jpg",
    rating: "8.2",
    link: "/search?q=Taxi+Driver",
  },
  {
    title: "Apocalypse Now",
    year: "1979",
    image: "https://image.tmdb.org/t/p/w500/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg",
    rating: "8.4",
    link: "/search?q=Apocalypse+Now",
  },
];

// 6. Halloween & Horror
export const HALLOWEEN_HORROR: Post[] = [
  {
    title: "The Shining",
    year: "1980",
    image: "https://image.tmdb.org/t/p/original/AdKA2F1SzYPhSZdEbjH1Zh75UVQ.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/AdKA2F1SzYPhSZdEbjH1Zh75UVQ.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/7Qc7geNI4C4i9A1OFk0aPe5VYzn.png",
    rating: "8.4",
    genres: "Horror",
    link: "/search?q=The+Shining",
  },
  {
    title: "Halloween",
    year: "1978",
    image: "https://image.tmdb.org/t/p/original/sHI9xlFRWCJ38AIIfOqnGjuEvXz.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/sHI9xlFRWCJ38AIIfOqnGjuEvXz.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/8diaqIjnZbpQupgtsv9Dun1HmLq.png",
    rating: "7.7",
    genres: "Horror",
    link: "/search?q=Halloween",
  },
  {
    title: "Hereditary",
    year: "2018",
    image: "https://image.tmdb.org/t/p/original/pS9Aub8MPyQbENblGD8mHeaqMuv.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/pS9Aub8MPyQbENblGD8mHeaqMuv.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/Vgm9366X76r8URpJ92VZEq5YKG.png",
    rating: "7.3",
    genres: "Horror, Mystery",
    link: "/search?q=Hereditary",
  },
  {
    title: "Psycho",
    year: "1960",
    image: "https://image.tmdb.org/t/p/original/vzXQEAmXIEWAtPCgB81bAS6EJCy.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/vzXQEAmXIEWAtPCgB81bAS6EJCy.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/3TLppfrmhnuldfXozpCmUIK6iXV.png",
    rating: "8.5",
    genres: "Horror, Thriller",
    link: "/search?q=Psycho",
  },
  {
    title: "The Thing",
    year: "1982",
    image: "https://image.tmdb.org/t/p/original/r9leYNa8nTRCceZrZhP1DXkgKVb.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/r9leYNa8nTRCceZrZhP1DXkgKVb.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/g5ny5fyIxZownMZjJi23oolMsCg.png",
    rating: "8.2",
    genres: "Horror, Sci-Fi",
    link: "/search?q=The+Thing",
  },
  {
    title: "Alien",
    year: "1979",
    image: "https://image.tmdb.org/t/p/original/caZ3wsV1sQN8eZvZdXUZiHQcoib.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/caZ3wsV1sQN8eZvZdXUZiHQcoib.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/riI33EA1vYQ1szTtMe0NR7TwV1p.png",
    rating: "8.5",
    genres: "Horror, Sci-Fi",
    link: "/search?q=Alien",
  },
  {
    title: "Scream",
    year: "1996",
    image: "https://image.tmdb.org/t/p/original/4w6nQYAY0eb7B0VVRDXilXcgAUV.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/4w6nQYAY0eb7B0VVRDXilXcgAUV.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/3PUi0PHLQEFvnEg9wbu18IF9hAX.svg",
    rating: "7.4",
    genres: "Horror, Mystery",
    link: "/search?q=Scream",
  },
  {
    title: "The Conjuring",
    year: "2013",
    image: "https://image.tmdb.org/t/p/original/ecKQlAEG95k62SMGhvX83oEqANK.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/ecKQlAEG95k62SMGhvX83oEqANK.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/5qjvxFhRZtvm4mcV90X9QNYLZVj.png",
    rating: "7.5",
    genres: "Horror",
    link: "/search?q=The+Conjuring",
  },
  {
    title: "Get Out",
    year: "2017",
    image: "https://image.tmdb.org/t/p/original/bBQHALHRAaaORlPNXv7fNcRXYdx.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/bBQHALHRAaaORlPNXv7fNcRXYdx.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/dJ3LNGrU9Mav7xkpcQb8N53ggWY.png",
    rating: "7.8",
    genres: "Horror, Mystery",
    link: "/search?q=Get+Out",
  },
  {
    title: "Nosferatu",
    year: "2024",
    image: "https://image.tmdb.org/t/p/original/gprjiZWY43vxSKngMha1wfb5TGG.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/gprjiZWY43vxSKngMha1wfb5TGG.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/pkAiCBNf5uDpqT2rCDmatRyhDiK.png",
    rating: "7.8",
    genres: "Horror, Fantasy",
    link: "/search?q=Nosferatu",
  },
];

// 7. Mindfuck Movies
const MINDFUCK_MOVIES: Post[] = [
  {
    title: "Interstellar",
    year: "2014",
    image: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    rating: "8.7",
    link: "/search?q=Interstellar",
  },
  {
    title: "Inception",
    year: "2010",
    image: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
    rating: "8.8",
    link: "/search?q=Inception",
  },
  {
    title: "Coherence",
    year: "2013",
    image: "https://image.tmdb.org/t/p/w500/ezUtb9m5DeLwL2gxi4gktzNCvQv.jpg",
    rating: "7.2",
    link: "/search?q=Coherence",
  },
  {
    title: "Donnie Darko",
    year: "2001",
    image: "https://image.tmdb.org/t/p/w500/j2AtZFsflxiluaNtajMTI0Avm8C.jpg",
    rating: "8.0",
    link: "/search?q=Donnie+Darko",
  },
  {
    title: "Mulholland Drive",
    year: "2001",
    image: "https://image.tmdb.org/t/p/w500/x7A59t6ySylr1L7aubOQEA480vM.jpg",
    rating: "7.9",
    link: "/search?q=Mulholland+Drive",
  },
  {
    title: "Predestination",
    year: "2014",
    image: "https://image.tmdb.org/t/p/w500/38Xr1JnV1ZcLQ55zmdSp6n475cZ.jpg",
    rating: "7.4",
    link: "/search?q=Predestination",
  },
  {
    title: "The Matrix",
    year: "1999",
    image: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    rating: "8.7",
    link: "/search?q=The+Matrix",
  },
  {
    title: "Eternal Sunshine of the Spotless Mind",
    year: "2004",
    image: "https://image.tmdb.org/t/p/w500/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg",
    rating: "8.3",
    link: "/search?q=Eternal+Sunshine+of+the+Spotless+Mind",
  },
  {
    title: "The Truman Show",
    year: "1998",
    image: "https://image.tmdb.org/t/p/w500/vuza0WqY239yBXOadKlGwJsZJFE.jpg",
    rating: "8.2",
    link: "/search?q=The+Truman+Show",
  },
];

// 8. Directed by Legends
const DIRECTED_BY_LEGENDS: Post[] = [
  {
    title: "GoodFellas",
    year: "1990",
    image: "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",
    rating: "8.7",
    link: "/search?q=GoodFellas",
  },
  {
    title: "Oppenheimer",
    year: "2023",
    image: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    rating: "8.9",
    link: "/search?q=Oppenheimer",
  },
  {
    title: "Pulp Fiction",
    year: "1994",
    image: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    rating: "8.9",
    link: "/search?q=Pulp+Fiction",
  },
  {
    title: "2001: A Space Odyssey",
    year: "1968",
    image: "https://image.tmdb.org/t/p/w500/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg",
    rating: "8.3",
    link: "/search?q=2001+A+Space+Odyssey",
  },
  {
    title: "Jurassic Park",
    year: "1993",
    image: "https://image.tmdb.org/t/p/w500/d9mtMGQDLANKieb9PbD3yK7xxzo.jpg",
    rating: "8.2",
    link: "/search?q=Jurassic+Park",
  },
  {
    title: "Fight Club",
    year: "1999",
    image: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    rating: "8.8",
    link: "/search?q=Fight+Club",
  },
  {
    title: "Blade Runner",
    year: "1982",
    image: "https://image.tmdb.org/t/p/w500/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg",
    rating: "8.1",
    link: "/search?q=Blade+Runner",
  },
  {
    title: "Spirited Away",
    year: "2001",
    image: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    rating: "8.6",
    link: "/search?q=Spirited+Away",
  },
  {
    title: "Vertigo",
    year: "1958",
    image: "https://image.tmdb.org/t/p/w500/15uOEfqBNTVtDUT7hGBVCka0rZz.jpg",
    rating: "8.3",
    link: "/search?q=Vertigo",
  },
];

export const UPCOMING_BLOCKBUSTERS: Post[] = [
  {
    title: "Avatar: Fire and Ash",
    year: "2025",
    image: "https://image.tmdb.org/t/p/w500/bRBeSHfGHwkEpImlhxPmOcUsaeg.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/u8DU5fkLoM5tTRukzPC31oGPxaQ.jpg",
    rating: "8.9",
    tag: "Dec 19, 2025",
    genres: "Sci-Fi, Adventure, Action",
    overview: "Jake Sully and Neytiri encounter a new, aggressive volcanic clan of Na'vi known as the Ash People on Pandora.",
    description: "Jake Sully and Neytiri encounter a new, aggressive volcanic clan of Na'vi known as the Ash People on Pandora.",
    link: "/search?q=Avatar+Fire+and+Ash",
    tmdbId: 83533,
  },
  {
    title: "TRON: Ares",
    year: "2025",
    image: "https://image.tmdb.org/t/p/w500/chpWmskl3aKm1aTZqUHRCtviwPy.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/pUNfHmVqfwRdILhCkU8TdysVOXo.jpg",
    rating: "8.1",
    tag: "Oct 10, 2025",
    genres: "Sci-Fi, Action, Adventure",
    overview: "A highly sophisticated Program named Ares is sent from the digital world into the real world on a dangerous assignment.",
    description: "A highly sophisticated Program named Ares is sent from the digital world into the real world on a dangerous assignment.",
    link: "/search?q=TRON+Ares",
    tmdbId: 533533,
  },
  {
    title: "Zootopia 2",
    year: "2025",
    image: "https://image.tmdb.org/t/p/w500/oJ7g2CifqpStmoYQyaLQgEU32qO.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/lgotja3xMoJZbynwHfcQcJAEMWH.jpg",
    rating: "8.2",
    tag: "Nov 26, 2025",
    genres: "Animation, Comedy, Adventure",
    overview: "Detectives Judy Hopps and Nick Wilde crack their most puzzling and dangerous case yet in the mammal metropolis.",
    description: "Detectives Judy Hopps and Nick Wilde crack their most puzzling and dangerous case yet in the mammal metropolis.",
    link: "/search?q=Zootopia+2",
    tmdbId: 1084242,
  },
  {
    title: "The Mandalorian and Grogu",
    year: "2026",
    image: "https://image.tmdb.org/t/p/w500/uwMKWjcNID0D9jjplsjkQS2OrB4.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/ysLlsAxwgNSxBWHCgTKJrmjxpRQ.jpg",
    rating: "8.5",
    tag: "May 22, 2026",
    genres: "Sci-Fi, Action, Adventure",
    overview: "Din Djarin and his young apprentice Grogu embark on a feature-length cinematic journey across the Outer Rim.",
    description: "Din Djarin and his young apprentice Grogu embark on a feature-length cinematic journey across the Outer Rim.",
    link: "/search?q=The+Mandalorian+and+Grogu",
    tmdbId: 1228710,
  },
  {
    title: "Toy Story 5",
    year: "2026",
    image: "https://image.tmdb.org/t/p/w500/sfQtVlIHljToOwYjhe21KPGzZWK.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/qjTqY5coNiz6sVtPng40IzltsoN.jpg",
    rating: "8.4",
    tag: "Jun 19, 2026",
    genres: "Animation, Adventure, Comedy, Family",
    overview: "Woody, Buzz Lightyear, and the gang confront a new digital frontier as electronics and tablets tempt modern kids away from real toys.",
    description: "Woody, Buzz Lightyear, and the gang confront a new digital frontier as electronics and tablets tempt modern kids away from real toys.",
    link: "/search?q=Toy+Story+5",
    tmdbId: 1084244,
  },
  {
    title: "Avatar: Fire and Ash",
    year: "2025",
    image: "https://image.tmdb.org/t/p/w500/yox310mQv045K423m0z3pW001.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/7c49P8n8P9oG9vP8aK9b6tX0v8.jpg",
    tag: "Dec 19, 2025",
    genres: "Sci-Fi, Adventure, Action",
    overview: "The third installment of James Cameron's Avatar saga exploring the fiery Ash People of Pandora.",
    description: "The third installment of James Cameron's Avatar saga exploring the fiery Ash People of Pandora.",
    link: "/search?q=Avatar+Fire+and+Ash",
    tmdbId: 83533,
  },
  {
    title: "Ramayana: Part 1",
    year: "2026",
    image: "https://image.tmdb.org/t/p/w500/f3yZZw7zIsWo6m9xJStfjDauIZX.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/yHVZncPRZr63mezRX20IyKLrSkv.jpg",
    tag: "Diwali 2026",
    genres: "Action, Fantasy, Adventure",
    overview: "Nitesh Tiwari's grand mythological magnum opus starring Ranbir Kapoor as Lord Rama, Sai Pallavi as Sita, and Yash as Ravana.",
    description: "Nitesh Tiwari's grand mythological magnum opus starring Ranbir Kapoor as Lord Rama, Sai Pallavi as Sita, and Yash as Ravana.",
    link: "/search?q=Ramayana",
    tmdbId: 656908,
  },
  {
    title: "Avengers: Doomsday",
    year: "2026",
    image: "https://image.tmdb.org/t/p/w500/jzPwsojjFStf5lR5Nm07w2hH56G.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/xaA2vNo563CwmchBWztkAYRf86Y.jpg",
    tag: "Dec 18, 2026",
    genres: "Action, Sci-Fi, Adventure",
    overview: "The Avengers assemble to confront Doctor Doom, portrayed by Robert Downey Jr., in a reality-shattering multiverse conflict.",
    description: "The Avengers assemble to confront Doctor Doom, portrayed by Robert Downey Jr., in a reality-shattering multiverse conflict.",
    link: "/search?q=Avengers+Doomsday",
    tmdbId: 1003596,
  },
  {
    title: "Spider-Man: Beyond the Spider-Verse",
    year: "2027",
    image: "https://image.tmdb.org/t/p/w500/9KAe39xqyZnv9J4W3DRGdQqX82h.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/fUcT8bcJD3SZsy84Z9QRP6kOS7v.jpg",
    tag: "Expected 2027",
    genres: "Animation, Action, Adventure",
    overview: "Miles Morales races across dimensions to save the multiverse and free himself from his alternate-reality Prowler self.",
    description: "Miles Morales races across dimensions to save the multiverse and free himself from his alternate-reality Prowler self.",
    link: "/search?q=Spider-Man+Beyond+the+Spider-Verse",
    tmdbId: 911916,
  },
  {
    title: "Shrek 5",
    year: "2027",
    image: "https://image.tmdb.org/t/p/w500/m9jLiemA7t2umlXKptDwtIUHU8l.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/wHbZr627WHFPMpfskRwX6NBgjxv.jpg",
    tag: "Expected 2027",
    genres: "Animation, Adventure, Comedy",
    overview: "Mike Myers, Eddie Murphy, and Cameron Diaz reunite in the long-awaited fifth chapter of the fairytale swamp saga.",
    description: "Mike Myers, Eddie Murphy, and Cameron Diaz reunite in the long-awaited fifth chapter of the fairytale swamp saga.",
    link: "/search?q=Shrek+5",
    tmdbId: 421892,
  },
  {
    title: "The Batman: Part II",
    year: "2028",
    image: "https://image.tmdb.org/t/p/w500/r5fl4aMsmTjgc8DdDqQaM84roWp.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/4uaHnYDDpUTj0nCg6YqBKab50YW.jpg",
    rating: "8.8",
    tag: "Oct 2, 2028",
    genres: "Crime, Drama, Action",
    overview: "Robert Pattinson returns as Bruce Wayne delving into the flooded underworld of Gotham City facing dangerous new villains.",
    description: "Robert Pattinson returns as Bruce Wayne delving into the flooded underworld of Gotham City facing dangerous new villains.",
    link: "/search?q=The+Batman+Part+II",
    tmdbId: 806704,
  },
];

export function getCachedLiveTrending(): Post[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("cinema_live_trending_movies");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return [];
}

const FAKE_TITLES_FILTER = new Set([
  "hope",
  "clayface",
  "fall 2: deadpoint",
  "deadpoint",
  "buddy",
  "other mommy",
  "the fix",
  "spider-man: brand new day",
  "brand new day",
]);

export function getCachedList(key: string): Post[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((m: any) => {
            const t = (m.title || "").toLowerCase();
            return !FAKE_TITLES_FILTER.has(t) && !Array.from(FAKE_TITLES_FILTER).some((f) => t.includes(f));
          });
        }
      }
    }
  } catch {}
  return [];
}

export function getCachedLiveTrendingTv(): Post[] {
  return getCachedList("cinema_live_trending_tv");
}

export function getCachedLiveTopMoviesToday(): Post[] {
  return getCachedList("cinema_live_top_movies_today");
}

export function getCachedLiveTopTvToday(): Post[] {
  return getCachedList("cinema_live_top_tv_today");
}

export function getCachedLivePopular(): Post[] {
  return getCachedList("cinema_live_popular");
}

export function getCachedLiveNewTvThisWeek(): Post[] {
  return getCachedList("cinema_live_new_tv_this_week");
}

export function getCachedLiveUpcoming(): Post[] {
  try {
    if (typeof window !== "undefined") {
      const todayStr = new Date().toISOString().split("T")[0];
      const raw = localStorage.getItem("cinema_live_upcoming_movies");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((m: any) => {
            const t = (m.title || "").toLowerCase();
            if (FAKE_TITLES_FILTER.has(t) || Array.from(FAKE_TITLES_FILTER).some((f) => t.includes(f))) return false;
            if (m.releaseDate && m.releaseDate <= todayStr) return false;
            if (m.release_date && m.release_date <= todayStr) return false;
            return true;
          });
        }
      }
    }
  } catch {}
  return [];
}

// Synchronous initial fallback shelves so Home renders instantaneously with NO delay or loading spinners!
export function getInitialHomeShelves(): HomeShelf[] {
  const top250 = IMDB_RANKINGS.slice(0, 16).map(rankedToPost);
  const letterboxdTop = LETTERBOXD_RANKINGS.slice(0, 16).map(rankedToPost);
  const criticallyAcclaimed = IMDB_RANKINGS.filter((r) => r.imdbRating >= 8.6).slice(0, 16).map(rankedToPost);

  return [
    {
      id: "trending-movies",
      title: "Trending Movies",
      items: getCachedLiveTrending(),
    },
    {
      id: "trending-tv-shows",
      title: "Trending TV Shows",
      items: getCachedLiveTrendingTv(),
    },
    {
      id: "popular-right-now",
      title: "Popular Right Now",
      items: getCachedLivePopular(),
    },
    {
      id: "coming-soon",
      title: "Coming Soon",
      items: getCachedLiveUpcoming(),
    },
    {
      id: "top-250-movies",
      title: "Top 250 Movies",
      items: top250,
    },
    {
      id: "critically-acclaimed",
      title: "Critically Acclaimed",
      items: criticallyAcclaimed,
    },
    {
      id: "letterboxd-top-250",
      title: "Letterboxd Top 250",
      items: letterboxdTop,
    },
    {
      id: "best-picture-winners",
      title: "Best Picture Winners",
      items: BEST_PICTURE_WINNERS,
    },
    {
      id: "emmy-award-winners",
      title: "Emmy Award Winners",
      items: EMMY_AWARD_WINNERS,
    },
    {
      id: "halloween-horror",
      title: "Halloween & Horror",
      items: HALLOWEEN_HORROR,
    },
    {
      id: "documentaries",
      title: "Documentaries",
      items: getCachedList("cinema_live_documentaries"),
    },
    {
      id: "box-office-hits",
      title: "Box Office Hits",
      items: BOX_OFFICE_HITS,
    },
    {
      id: "top-250-of-all-time",
      title: "Top 250 of All Time",
      items: top250,
    },
    {
      id: "psychological-thrillers",
      title: "Psychological Thrillers",
      items: PSYCHOLOGICAL_THRILLERS,
    },
    {
      id: "palme-dor-winners",
      title: "Palme d'Or Winners",
      items: PALME_DOR_WINNERS,
    },
    {
      id: "highest-rated-letterboxd",
      title: "Highest Rated on Letterboxd",
      items: letterboxdTop,
    },
    {
      id: "mindfuck-movies",
      title: "Mindfuck Movies",
      items: MINDFUCK_MOVIES,
    },
    {
      id: "directed-by-legends",
      title: "Directed by Legends",
      items: DIRECTED_BY_LEGENDS,
    },
  ];
}

// ==========================================
// HOME TAB SPOTLIGHT ITEMS (Dynamic from live trending movies ONLY)
// ==========================================
export const HOME_SPOTLIGHT_ITEMS: Post[] = getCachedLiveTrending().slice(0, 6);

// ==========================================
// MOVIES TAB CURATED SPOTLIGHT & SHELVES (Image 1)
// ==========================================
export const MOVIES_SPOTLIGHT_ITEMS: Post[] = getCachedLiveTrending().slice(0, 6);

export function getInitialMoviesShelves(): HomeShelf[] {
  const top250 = IMDB_RANKINGS.slice(0, 16).map(rankedToPost);
  const criticallyAcclaimed = IMDB_RANKINGS.filter((r) => r.imdbRating >= 8.5).slice(0, 16).map(rankedToPost);

  return [
    {
      id: "top-10-movies-today",
      title: "Top 10 Movies Today",
      items: getCachedLiveTopMoviesToday().slice(0, 10),
    },
    {
      id: "trending-movies",
      title: "Trending Movies",
      items: getCachedLiveTrending(),
    },
    {
      id: "coming-soon",
      title: "Coming Soon",
      items: getCachedLiveUpcoming(),
    },
    {
      id: "popular-right-now",
      title: "Popular Right Now",
      items: getCachedLivePopular(),
    },
    {
      id: "critically-acclaimed",
      title: "Critically Acclaimed",
      items: criticallyAcclaimed,
    },
    {
      id: "franchises",
      title: "Franchises",
      items: [
        {
          title: "Star Wars Saga",
          year: "1977-",
          image: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg",
          link: "/search?q=Star+Wars",
        },
        {
          title: "Harry Potter Collection",
          year: "2001-",
          image: "https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/achmETPRJZc9QVXsMPgHwYEyNar.jpg",
          link: "/search?q=Harry+Potter",
        },
        {
          title: "The Lord of the Rings",
          year: "2001-",
          image: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cDK6.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/achmETPRJZc9QVXsMPgHwYEyNar.jpg",
          link: "/search?q=Lord+of+the+Rings",
        },
        {
          title: "The Dark Knight Trilogy",
          year: "2005-",
          image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
          link: "/search?q=The+Dark+Knight",
        },
      ],
    },
    {
      id: "documentaries",
      title: "Documentaries",
      items: getCachedList("cinema_live_documentaries"),
    },
    {
      id: "box-office-hits",
      title: "Box Office Hits",
      items: BOX_OFFICE_HITS,
    },
    {
      id: "timeless-classics",
      title: "Timeless Classics",
      items: top250.slice(0, 10),
    },
  ];
}

// ==========================================
// TV SHOWS TAB CURATED SPOTLIGHT & SHELVES (Image 2)
// ==========================================
export const TV_SPOTLIGHT_ITEMS: Post[] = getCachedLiveTrendingTv().slice(0, 6);

export function getInitialTvShelves(): HomeShelf[] {
  const topToday = getCachedLiveTopTvToday().slice(0, 10);
  const trending = getCachedLiveTrendingTv();
  const newEpisodes = getCachedLiveNewTvThisWeek();

  return [
    {
      id: "top-10-shows-today",
      title: "Top 10 Shows Today",
      items: topToday.length > 0 ? topToday : EMMY_AWARD_WINNERS.slice(0, 10),
    },
    {
      id: "popular-shows",
      title: "Popular Shows",
      items: trending.length > 0 ? trending : EMMY_AWARD_WINNERS,
    },
    {
      id: "new-episodes-this-week",
      title: "New Episodes This Week",
      items: newEpisodes.length > 0 ? newEpisodes : EMMY_AWARD_WINNERS.slice(2, 12),
    },
    {
      id: "emmy-award-winners",
      title: "Emmy Award Winners",
      items: EMMY_AWARD_WINNERS,
    },
    {
      id: "top-rated",
      title: "Top Rated Series",
      items: [
        {
          title: "Breaking Bad",
          year: "2008-2013",
          rating: "9.5",
          image: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
          link: "/search?q=Breaking+Bad",
        },
        {
          title: "Chernobyl",
          year: "2019",
          rating: "9.4",
          image: "https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/uL6AdB508hkgI1bS5oZz7yq8yUe.jpg",
          link: "/search?q=Chernobyl",
        },
        {
          title: "The Sopranos",
          year: "1999-2007",
          rating: "9.2",
          image: "https://image.tmdb.org/t/p/w500/rTc7ZXdroqjkKivFPvCPX0Ru7uw.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/lHeQ4Xw4kE3z9U5lHn6Y9J2.jpg",
          link: "/search?q=The+Sopranos",
        },
        {
          title: "Succession",
          year: "2018-2023",
          rating: "8.9",
          image: "https://image.tmdb.org/t/p/w500/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
          link: "/search?q=Succession",
        },
      ],
    },
    {
      id: "docuseries",
      title: "Docuseries",
      items: getCachedList("cinema_live_docuseries"),
    },
    {
      id: "comedy",
      title: "Comedy Series",
      items: [
        {
          title: "The Office",
          year: "2005-2013",
          image: "https://image.tmdb.org/t/p/w500/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg",
          rating: "9.0",
          link: "/search?q=The+Office",
        },
        {
          title: "Ted Lasso",
          year: "2020-2023",
          image: "https://image.tmdb.org/t/p/w500/uRHsiw1wLxPHFXkkv4Ix1s0O6f4.jpg",
          rating: "8.8",
          link: "/search?q=Ted+Lasso",
        },
        {
          title: "Fleabag",
          year: "2016-2019",
          image: "https://image.tmdb.org/t/p/w500/vFn0nLPcIggPH5LTWWaJ2hcsGlc.jpg",
          rating: "8.7",
          link: "/search?q=Fleabag",
        },
      ],
    },
    {
      id: "animation",
      title: "Animation & Anime",
      items: [
        {
          title: "Arcane",
          year: "2021-",
          rating: "9.0",
          image: "https://image.tmdb.org/t/p/w500/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/achmETPRJZc9QVXsMPgHwYEyNar.jpg",
          link: "/search?q=Arcane",
        },
        {
          title: "Cyberpunk: Edgerunners",
          year: "2022",
          rating: "8.6",
          image: "https://image.tmdb.org/t/p/w500/7JsnIvh8J5T3p5m9K2A0Z0B.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/original/achmETPRJZc9QVXsMPgHwYEyNar.jpg",
          link: "/search?q=Cyberpunk",
        },
      ],
    },
  ];
}

// Robust TMDB fetcher with automated proxy fallback
async function fetchCuratedTmdb(endpoint: string): Promise<any> {
  const directUrl = `${BASE_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${TMDB_API_KEY}`;
  try {
    const res = await fetch(directUrl);
    if (res.ok) return await res.json();
  } catch (_) {}

  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) return await res.json();
  } catch (_) {}

  try {
    const cfUrl = `https://cinema-dwh.pages.dev/api/proxy?url=${encodeURIComponent(directUrl)}`;
    const res = await fetch(cfUrl);
    if (res.ok) return await res.json();
  } catch (_) {}

  return null;
}

function formatReleaseBadge(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return undefined;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return undefined;
  }
}

export function isFakePlaceholder(title?: string | null): boolean {
  if (!title) return false;
  const clean = title.toLowerCase().trim();
  const FAKES = [
    "hope",
    "clayface",
    "fall 2: deadpoint",
    "deadpoint",
    "buddy",
    "other mommy",
    "the fix",
    "spider-man: brand new day",
    "brand new day",
  ];
  return FAKES.some((f) => clean === f || clean.includes(f));
}

export function formatTmdbResults(results: any[], isTv = false, onlyReleased = false): Post[] {
  if (!Array.isArray(results)) return [];
  const todayStr = new Date().toISOString().split("T")[0];
  return results
    .filter((r) => {
      if (!r || (!r.poster_path && !r.backdrop_path)) return false;
      const t = r.title || r.name || "";
      if (isFakePlaceholder(t)) return false;
      if (onlyReleased) {
        const releaseDate = r.release_date || r.first_air_date || "";
        if (!releaseDate || releaseDate > todayStr) return false;
        if (typeof r.vote_count === "number" && r.vote_count === 0) return false;
      }
      return true;
    })
    .slice(0, 16)
    .map((r) => {
      const genres = Array.isArray(r.genre_ids)
        ? r.genre_ids.map((id: number) => TMDB_GENRES[id]).filter(Boolean).join(", ")
        : "";
      const releaseDate = r.release_date || r.first_air_date || "";

      return {
        title: r.title || r.name,
        year: releaseDate.slice(0, 4),
        image: r.poster_path ? `${IMG_BASE_W500}${r.poster_path}` : `${IMG_BASE_W500}${r.backdrop_path}`,
        rating: r.vote_average ? r.vote_average.toFixed(1) : undefined,
        link: `/search?q=${encodeURIComponent(r.title || r.name)}`,
        backdropUrl: r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : undefined,
        genres,
        overview: r.overview || undefined,
        description: r.overview || undefined,
        mediaType: (isTv || r.name) ? "tv" : "movie",
        tmdbId: r.id,
      };
    });
}

// Live fetcher that gracefully updates Trending, Popular, Coming Soon, and Documentaries shelves
export async function fetchLiveHomeTrending(): Promise<{
  trendingMovies?: Post[];
  trendingTv?: Post[];
  popular?: Post[];
  comingSoon?: Post[];
  documentaries?: Post[];
  docuseries?: Post[];
  topMoviesToday?: Post[];
  topTvToday?: Post[];
  newTvThisWeek?: Post[];
}> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const [
      moviesRes,
      tvRes,
      popRes,
      upcomingRes,
      docsRes,
      docuseriesRes,
      moviesTodayRes,
      tvTodayRes,
      airingRes,
    ] = await Promise.allSettled([
      fetchCuratedTmdb("/trending/movie/week"),
      fetchCuratedTmdb("/trending/tv/week"),
      fetchCuratedTmdb("/movie/popular"),
      fetchCuratedTmdb(`/discover/movie?primary_release_date.gte=${todayStr}&sort_by=popularity.desc`),
      fetchCuratedTmdb("/discover/movie?with_genres=99&sort_by=popularity.desc"),
      fetchCuratedTmdb("/discover/tv?with_genres=99&sort_by=popularity.desc"),
      fetchCuratedTmdb("/trending/movie/day"),
      fetchCuratedTmdb("/trending/tv/day"),
      fetchCuratedTmdb("/tv/on_the_air"),
    ]);

    const trendingMovies = (() => {
      if (moviesRes.status === "fulfilled" && Array.isArray(moviesRes.value?.results)) {
        const list = formatTmdbResults(moviesRes.value.results, false, true).filter(
          (m) => !isFakePlaceholder(m.title)
        );
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("cinema_live_trending_movies", JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    })();

    const trendingTv = (() => {
      if (tvRes.status === "fulfilled" && Array.isArray(tvRes.value?.results)) {
        const list = formatTmdbResults(tvRes.value.results, true, true).filter(
          (m) => !isFakePlaceholder(m.title)
        );
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("cinema_live_trending_tv", JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    })();

    const popular = (() => {
      if (popRes.status === "fulfilled" && Array.isArray(popRes.value?.results)) {
        const list = formatTmdbResults(popRes.value.results, false, true).filter(
          (m) => !isFakePlaceholder(m.title)
        );
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("cinema_live_popular", JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    })();

    const comingSoon = (() => {
      const rawResults = upcomingRes.status === "fulfilled" && Array.isArray(upcomingRes.value?.results)
        ? upcomingRes.value.results
        : [];
      const liveUpcoming = formatTmdbResults(rawResults)
        .filter((m) => {
          if (isFakePlaceholder(m.title)) return false;
          const raw = rawResults.find((r: any) => (r.title || r.name) === m.title);
          const relDate = raw?.release_date || raw?.first_air_date || "";
          // STRICT DATE FILTER: MUST BE IN THE FUTURE! (release_date > todayStr)
          if (!relDate || relDate <= todayStr) return false;
          return true;
        })
        .map((m) => {
          const raw = rawResults.find((r: any) => (r.title || r.name) === m.title);
          let tag: string | undefined = undefined;
          if (raw?.release_date) {
            const parts = raw.release_date.split("-");
            if (parts.length === 3) {
              const year = parts[0];
              const monthIdx = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
                tag = `${months[monthIdx]} ${day}, ${year}`;
              }
            }
          }
          if (!tag && m.year) {
            tag = `Expected ${m.year}`;
          }
          return { ...m, tag };
        });
      if (liveUpcoming.length > 0) {
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("cinema_live_upcoming_movies", JSON.stringify(liveUpcoming));
          }
        } catch {}
        return liveUpcoming;
      }
      const cached = getCachedLiveUpcoming();
      return cached.length > 0 ? cached : UPCOMING_BLOCKBUSTERS;
    })();

    const documentaries = (() => {
      if (docsRes.status === "fulfilled" && Array.isArray(docsRes.value?.results)) {
        const list = formatTmdbResults(docsRes.value.results).filter((m) => !isFakePlaceholder(m.title));
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("cinema_live_documentaries", JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    })();

    const docuseries = (() => {
      if (docuseriesRes.status === "fulfilled" && Array.isArray(docuseriesRes.value?.results)) {
        const list = formatTmdbResults(docuseriesRes.value.results, true).filter((m) => !isFakePlaceholder(m.title));
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("cinema_live_docuseries", JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    })();

    const topMoviesToday = (() => {
      if (moviesTodayRes.status === "fulfilled" && Array.isArray(moviesTodayRes.value?.results)) {
        const list = formatTmdbResults(moviesTodayRes.value.results, false, true).filter(
          (m) => !isFakePlaceholder(m.title)
        );
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("cinema_live_top_movies_today", JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    })();

    const topTvToday = (() => {
      if (tvTodayRes.status === "fulfilled" && Array.isArray(tvTodayRes.value?.results)) {
        const list = formatTmdbResults(tvTodayRes.value.results, true, true).filter(
          (m) => !isFakePlaceholder(m.title)
        );
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("cinema_live_top_tv_today", JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    })();

    const newTvThisWeek = (() => {
      if (airingRes.status === "fulfilled" && Array.isArray(airingRes.value?.results)) {
        const list = formatTmdbResults(airingRes.value.results, true).filter(
          (m) => !isFakePlaceholder(m.title)
        );
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("cinema_live_new_tv_this_week", JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    })();

    return {
      trendingMovies,
      trendingTv,
      popular,
      comingSoon,
      documentaries,
      docuseries,
      topMoviesToday,
      topTvToday,
      newTvThisWeek,
    };
  } catch {
    return {};
  }
}

// ==========================================
// ANIME MASTERPIECES (Curated Historical / Top-Rated Japanese Anime)
// ==========================================
export const ANIME_MASTERPIECES: Post[] = [
  {
    title: "Attack on Titan",
    year: "2013-2023",
    rating: "9.1",
    image: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/b33nnKl1vAOM497fImGlAExjIO5.jpg",
    genres: "Animation, Action, Sci-Fi & Fantasy",
    overview: "After his hometown is destroyed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.",
    description: "After his hometown is destroyed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.",
    link: "/search?q=Attack+on+Titan",
    tmdbId: 1429,
    mediaType: "tv",
  },
  {
    title: "Fullmetal Alchemist: Brotherhood",
    year: "2009-2010",
    rating: "9.1",
    image: "https://image.tmdb.org/t/p/w500/5ZFUEOULaVml7p19UPFSp6EDsmV.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/2rmK7mnchsl9Yr372MslvqoIo9q.jpg",
    genres: "Animation, Action & Adventure, Sci-Fi & Fantasy",
    overview: "Two brothers search for a Philosopher's Stone after an attempt to revive their deceased mother goes horribly awry and leaves them in damaged physical forms.",
    description: "Two brothers search for a Philosopher's Stone after an attempt to revive their deceased mother goes horribly awry and leaves them in damaged physical forms.",
    link: "/search?q=Fullmetal+Alchemist+Brotherhood",
    tmdbId: 31911,
    mediaType: "tv",
  },
  {
    title: "Death Note",
    year: "2006-2007",
    rating: "9.0",
    image: "https://image.tmdb.org/t/p/w500/iigTJJskR1PcjjRt6ddgmWmJ3ip.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/96ey8lT6GfEa6rE2eZ6kC62W6R9.jpg",
    genres: "Animation, Mystery, Sci-Fi & Fantasy",
    overview: "An intelligent high school student goes on a secret crusade to eliminate criminals from the world after discovering a notebook capable of killing anyone whose name is written into it.",
    description: "An intelligent high school student goes on a secret crusade to eliminate criminals from the world after discovering a notebook capable of killing anyone whose name is written into it.",
    link: "/search?q=Death+Note",
    tmdbId: 13916,
    mediaType: "tv",
  },
  {
    title: "Hunter x Hunter",
    year: "2011-2014",
    rating: "9.0",
    image: "https://image.tmdb.org/t/p/w500/ucmpFdWcHGwvZ26TYRg62Y30NdH.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/fQq1FWp1rCnxviaxYehFEyhFFSu.jpg",
    genres: "Animation, Action & Adventure, Sci-Fi & Fantasy",
    overview: "Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness. With his friends and his potential, he seeks out his father, who left him when he was younger.",
    description: "Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness. With his friends and his potential, he seeks out his father, who left him when he was younger.",
    link: "/search?q=Hunter+x+Hunter",
    tmdbId: 46298,
    mediaType: "tv",
  },
  {
    title: "Frieren: Beyond Journey's End",
    year: "2023-2024",
    rating: "9.1",
    image: "https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/c4rQc3n9pG0n5r2m3r4w5x6y7z8.jpg",
    genres: "Animation, Sci-Fi & Fantasy, Drama",
    overview: "An elf and her friends defeat a demon king in a great ten-year war, but only she survives long enough to reflect on what living truly means.",
    description: "An elf and her friends defeat a demon king in a great ten-year war, but only she survives long enough to reflect on what living truly means.",
    link: "/search?q=Frieren+Beyond+Journeys+End",
    tmdbId: 209867,
    mediaType: "tv",
  },
  {
    title: "Steins;Gate",
    year: "2011",
    rating: "8.9",
    image: "https://image.tmdb.org/t/p/w500/5X0r97gR1m5s0k2n4p3v1q5e6r7.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/rcA5O36pB90VjT4Y7uA5lD3D4l5.jpg",
    genres: "Animation, Sci-Fi & Fantasy, Drama",
    overview: "A self-proclaimed mad scientist discovers the means to send messages across time, unleashing unintended cascading consequences.",
    description: "A self-proclaimed mad scientist discovers the means to send messages across time, unleashing unintended cascading consequences.",
    link: "/search?q=Steins+Gate",
    tmdbId: 39515,
    mediaType: "tv",
  },
  {
    title: "Spirited Away",
    year: "2001",
    rating: "8.6",
    image: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/Ab8mkHmkYADjU7wQiOkia99GQI.jpg",
    genres: "Animation, Family, Fantasy",
    overview: "A young girl wanders into a magical world ruled by gods and spirits where humans are transformed into beasts.",
    description: "A young girl wanders into a magical world ruled by gods and spirits where humans are transformed into beasts.",
    link: "/search?q=Spirited+Away",
    tmdbId: 129,
    mediaType: "movie",
  },
  {
    title: "Your Name.",
    year: "2016",
    rating: "8.5",
    image: "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6qFsxWa93bu.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/dIWwZWfhioTkb9QCW8Li9psRJIl.jpg",
    genres: "Animation, Romance, Drama",
    overview: "Two teenagers share a profound, magical connection upon discovering they are swapping bodies across space and time.",
    description: "Two teenagers share a profound, magical connection upon discovering they are swapping bodies across space and time.",
    link: "/search?q=Your+Name",
    tmdbId: 372058,
    mediaType: "movie",
  },
];

// ==========================================
// ANIME SPOTLIGHT HERO CAROUSEL CANDIDATES
// ==========================================
export const ANIME_SPOTLIGHT_ITEMS: Post[] = [
  {
    title: "Solo Leveling",
    year: "2024-",
    rating: "8.5",
    image: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuPxJ8HGpd.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/2wT7d2b63j1h6r8n3k7t5y4u2v.jpg",
    genres: "Action, Fantasy, Animation",
    overview: "In a world where hunters face deadly magical beasts, the weakest hunter Sung Jinwoo discovers a quest log that only he can see.",
    description: "In a world where hunters face deadly magical beasts, the weakest hunter Sung Jinwoo discovers a quest log that only he can see.",
    link: "/search?q=Solo+Leveling",
    tmdbId: 209117,
    mediaType: "tv",
  },
  {
    title: "Attack on Titan",
    year: "2013-2023",
    rating: "9.1",
    image: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/b33nnKl1vAOM497fImGlAExjIO5.jpg",
    genres: "Animation, Action, Sci-Fi & Fantasy",
    overview: "Humanity fights for survival against the towering monstrosities known as Titans behind three colossal concentric walls.",
    description: "Humanity fights for survival against the towering monstrosities known as Titans behind three colossal concentric walls.",
    link: "/search?q=Attack+on+Titan",
    tmdbId: 1429,
    mediaType: "tv",
  },
  {
    title: "Demon Slayer: Kimetsu no Yaiba",
    year: "2019-",
    rating: "8.7",
    image: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/7c9UVPPiTPltouxSh26AQi2kMjh.jpg",
    genres: "Animation, Action & Adventure, Sci-Fi & Fantasy",
    overview: "A youth dedicated to avenging his family and healing his demon sister joins the elite Demon Slayer Corps.",
    description: "A youth dedicated to avenging his family and healing his demon sister joins the elite Demon Slayer Corps.",
    link: "/search?q=Demon+Slayer",
    tmdbId: 85937,
    mediaType: "tv",
  },
  {
    title: "Jujutsu Kaisen",
    year: "2020-",
    rating: "8.6",
    image: "https://image.tmdb.org/t/p/w500/hFWScq795Znd1p28q4m5n7r2q.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/gmECX1Dv2y4tTq9z8uUv3pM5r0q.jpg",
    genres: "Animation, Action, Supernatural",
    overview: "A boy swallows a cursed talisman to save his friends, becoming the host of the King of Curses Ryomen Sukuna.",
    description: "A boy swallows a cursed talisman to save his friends, becoming the host of the King of Curses Ryomen Sukuna.",
    link: "/search?q=Jujutsu+Kaisen",
    tmdbId: 95479,
    mediaType: "tv",
  },
  {
    title: "Frieren: Beyond Journey's End",
    year: "2023-2024",
    rating: "9.1",
    image: "https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/c4rQc3n9pG0n5r2m3r4w5x6y7z8.jpg",
    genres: "Animation, Fantasy, Adventure",
    overview: "An elven mage reflects on human mortality, companionship, and memory across generations following the defeat of the Demon King.",
    description: "An elven mage reflects on human mortality, companionship, and memory across generations following the defeat of the Demon King.",
    link: "/search?q=Frieren",
    tmdbId: 209867,
    mediaType: "tv",
  },
  {
    title: "Spirited Away",
    year: "2001",
    rating: "8.6",
    image: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/Ab8mkHmkYADjU7wQiOkia99GQI.jpg",
    genres: "Animation, Fantasy, Family",
    overview: "Hayao Miyazaki's Academy Award-winning masterpiece of courage, ancient spirits, and wonder.",
    description: "Hayao Miyazaki's Academy Award-winning masterpiece of courage, ancient spirits, and wonder.",
    link: "/search?q=Spirited+Away",
    tmdbId: 129,
    mediaType: "movie",
  },
];

// ==========================================
// ANIME TAB DYNAMIC FETCHERS & INITIAL SHELVES
// ==========================================
export async function fetchLiveAnimeTrending(): Promise<{
  topAnimeToday?: Post[];
  trendingAnime?: Post[];
  animeMovies?: Post[];
  shonenAction?: Post[];
  darkFantasy?: Post[];
  romanceAnime?: Post[];
}> {
  try {
    const [
      topTodayRes,
      trendingRes,
      moviesRes,
      shonenRes,
      darkRes,
      romanceRes,
    ] = await Promise.allSettled([
      fetchCuratedTmdb("/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc"),
      fetchCuratedTmdb("/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_count.desc&page=1"),
      fetchCuratedTmdb("/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc"),
      fetchCuratedTmdb("/discover/tv?with_genres=16,10759&with_original_language=ja&sort_by=popularity.desc"),
      fetchCuratedTmdb("/discover/tv?with_genres=16,10765&with_original_language=ja&sort_by=popularity.desc"),
      fetchCuratedTmdb("/discover/tv?with_genres=16,10749&with_original_language=ja&sort_by=popularity.desc"),
    ]);

    const formatAndCache = (res: PromiseSettledResult<any>, key: string, isTv = true) => {
      if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
        const list = formatTmdbResults(res.value.results, isTv, true).filter(
          (m) => !isFakePlaceholder(m.title)
        );
        if (list.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(key, JSON.stringify(list));
            }
          } catch {}
          return list;
        }
      }
      return undefined;
    };

    return {
      topAnimeToday: formatAndCache(topTodayRes, "cinema_live_anime_top_today", true),
      trendingAnime: formatAndCache(trendingRes, "cinema_live_anime_trending", true),
      animeMovies: formatAndCache(moviesRes, "cinema_live_anime_movies", false),
      shonenAction: formatAndCache(shonenRes, "cinema_live_anime_shonen", true),
      darkFantasy: formatAndCache(darkRes, "cinema_live_anime_dark", true),
      romanceAnime: formatAndCache(romanceRes, "cinema_live_anime_romance", true),
    };
  } catch {
    return {};
  }
}

export function getInitialAnimeShelves(): HomeShelf[] {
  const topToday = getCachedList("cinema_live_anime_top_today");
  const trending = getCachedList("cinema_live_anime_trending");
  const movies = getCachedList("cinema_live_anime_movies");
  const shonen = getCachedList("cinema_live_anime_shonen");
  const dark = getCachedList("cinema_live_anime_dark");
  const romance = getCachedList("cinema_live_anime_romance");

  return [
    {
      id: "top-10-anime-today",
      title: "Top 10 Anime Today",
      items: (topToday.length > 0 ? topToday : ANIME_MASTERPIECES).slice(0, 10),
    },
    {
      id: "trending-anime",
      title: "Trending Anime",
      items: trending.length > 0 ? trending : ANIME_MASTERPIECES,
    },
    {
      id: "critically-acclaimed-anime",
      title: "Critically Acclaimed Masterpieces",
      items: ANIME_MASTERPIECES,
    },
    {
      id: "shonen-action-anime",
      title: "Popular Shonen & Action",
      items: shonen.length > 0 ? shonen : ANIME_MASTERPIECES.slice(0, 6),
    },
    {
      id: "anime-movies",
      title: "Anime Feature Films & Movies",
      items: movies.length > 0 ? movies : [
        ANIME_MASTERPIECES[6],
        ANIME_MASTERPIECES[7],
      ],
    },
    {
      id: "dark-fantasy-anime",
      title: "Dark Fantasy & Psychological",
      items: dark.length > 0 ? dark : [
        ANIME_MASTERPIECES[0],
        ANIME_MASTERPIECES[2],
        ANIME_MASTERPIECES[5],
      ],
    },
    {
      id: "romance-slice-anime",
      title: "Romance & Slice of Life",
      items: romance.length > 0 ? romance : [
        ANIME_MASTERPIECES[4],
        ANIME_MASTERPIECES[7],
      ],
    },
    {
      id: "classics-anime",
      title: "Timeless Classics",
      items: ANIME_MASTERPIECES.slice(1, 7),
    },
  ];
}


