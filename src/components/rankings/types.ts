import type { Post } from "../../types";
import type { RankedItem } from "../../data/rankingsData";

export type PlatformMode = "imdb" | "letterboxd";
export type PageMode = "top250" | "letterboxd" | "imdb";
export type SortKey = string;

export interface CategoryFilter {
  id: string;
  label: string;
}

export interface RankingsHubPageProps {
  onSelectPost: (post: Post) => void;
  onBack: () => void;
  activeProviderKey?: string;
  initialMode?: PlatformMode;
  initialCategory?: string;
  pageMode?: PageMode;
}

export type { RankedItem };
