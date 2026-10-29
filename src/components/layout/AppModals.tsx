import React from "react";
import { DetailsModal } from "../details/DetailsModal";
import { PersonDetailsModal } from "../person/PersonDetailsModal";
import { DownloadManagerModal } from "../downloads/DownloadManagerModal";
import { SettingsPage } from "../settings/SettingsPage";
import { UpdateModal } from "../updater/UpdateModal";
import { VideoPlayerModal } from "../player/VideoPlayerModal";
import { ContinueWatchingModal } from "../media/ContinueWatchingModal";
import { clearOverlayState, saveNavigationState } from "../../utils/navigationState";
import { cleanSearchQuery } from "../../utils/routeState";
import type { Provider, MediaPost, MediaDetails, StreamItem, ExternalPlayerType } from "../../types";

export interface AppModalsProps {
  selectedPost: MediaPost | null;
  setSelectedPost: (p: MediaPost | null) => void;
  details: MediaDetails | null;
  setDetails: (d: MediaDetails | null) => void;
  loadingDetails: boolean;
  streams: StreamItem[];
  setStreams: (s: StreamItem[]) => void;
  loadingStreams: boolean;
  activeProvider: Provider | null;
  installedProviders: Provider[];
  handleSelectProvider: (p: Provider) => void;
  handleSelectPost: (post: MediaPost, preserveProvider?: boolean) => void;
  handleCloseDetails: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isGlobalSearch: boolean;
  setIsGlobalSearch: (g: boolean) => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  handleBackToHome: () => void;
  handleSelectCategoryNav: (tab: any) => void;
  activeNavTab: string;
  defaultPlayer?: ExternalPlayerType;
  detailsInitialTab: "overview" | "sources";
  handleOpenStreamPlayer: (stream: StreamItem) => void;
  handlePlayExternal: (stream: StreamItem) => void;
  handleOpenPerson: (personId: number) => void;
  detailsHistoryStackRef: React.MutableRefObject<any[]>;
  setActiveCustomPage: (p: any) => void;
  setIsBrowsingCategories: (b: boolean) => void;
  setViewAllCategory: (c: any) => void;
  setSelectedCategoryId: (c: any) => void;
  setSelectedGenreCategory: (g: any) => void;
  setSelectedProviderGenre: (pg: any) => void;
  setIsMergedFilter: (m: boolean) => void;
  setPage: (p: number) => void;
  selectedPersonId: number | null;
  handleClosePerson: () => void;
  downloadManagerOpen: boolean;
  setDownloadManagerOpen: (open: boolean) => void;
  ambientBackdrop: string | null;
  heroPost: any;
  heroCandidatePosts: any[];
  activeSectionSlides: string[];
  playerModalState: any;
  setPlayerModalState: React.Dispatch<React.SetStateAction<any>>;
  playbackUrl: string | null;
  handleClosePlayer: () => void;
  continueWatchingModalOpen: boolean;
  setContinueWatchingModalOpen: (open: boolean) => void;
  handleResumeContinueWatching: (item: any) => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  selectedPost,
  setSelectedPost,
  details,
  setDetails,
  loadingDetails,
  streams,
  setStreams,
  loadingStreams,
  activeProvider,
  installedProviders,
  handleSelectProvider,
  handleSelectPost,
  handleCloseDetails,
  searchQuery,
  setSearchQuery,
  isGlobalSearch,
  setIsGlobalSearch,
  settingsModalOpen,
  setSettingsModalOpen,
  handleBackToHome,
  handleSelectCategoryNav,
  activeNavTab,
  defaultPlayer,
  detailsInitialTab,
  handleOpenStreamPlayer,
  handlePlayExternal,
  handleOpenPerson,
  detailsHistoryStackRef,
  setActiveCustomPage,
  setIsBrowsingCategories,
  setViewAllCategory,
  setSelectedCategoryId,
  setSelectedGenreCategory,
  setSelectedProviderGenre,
  setIsMergedFilter,
  setPage,
  selectedPersonId,
  handleClosePerson,
  downloadManagerOpen,
  setDownloadManagerOpen,
  ambientBackdrop,
  heroPost,
  heroCandidatePosts,
  activeSectionSlides,
  playerModalState,
  setPlayerModalState,
  playbackUrl,
  handleClosePlayer,
  continueWatchingModalOpen,
  setContinueWatchingModalOpen,
  handleResumeContinueWatching,
}) => {
  return (
    <>
      {/* 5. Media Details & Releases Modal */}
      {selectedPost && (
        <DetailsModal
          post={selectedPost}
          details={details}
          loadingDetails={loadingDetails}
          streams={streams}
          loadingStreams={loadingStreams}
          activeProvider={activeProvider}
          providers={installedProviders}
          onSelectProvider={(p) => {
            handleSelectProvider(p);
            if (selectedPost) {
              const updated = { ...selectedPost, provider: p.value };
              handleSelectPost(updated, true);
            } else {
              handleCloseDetails();
            }
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            handleCloseDetails();
          }}
          isGlobalSearch={isGlobalSearch}
          onToggleGlobalSearch={() => setIsGlobalSearch(!isGlobalSearch)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onGoHome={() => {
            handleBackToHome();
            handleCloseDetails();
          }}
          onSelectCategoryNav={(type) => {
            handleSelectCategoryNav(type);
            handleCloseDetails();
          }}
          activeNavTab={activeNavTab}
          defaultPlayer={defaultPlayer}
          onClose={handleCloseDetails}
          initialTab={detailsInitialTab}
          onPlayStream={handleOpenStreamPlayer}
          onPlayExternal={handlePlayExternal}
          onSelectRecommended={(p) => handleSelectPost(p)}
          onSelectPerson={handleOpenPerson}
          onSearchGlobal={(title) => {
            const rawTitle = title || selectedPost?.title || details?.title || "";
            const clean = cleanSearchQuery(rawTitle);
            const q = clean || rawTitle.trim();
            if (!q) return;

            detailsHistoryStackRef.current = [];
            setSelectedPost(null);
            setDetails(null);
            setStreams([]);
            clearOverlayState();
            document.body.style.overflow = "";

            setActiveCustomPage(null);
            setIsBrowsingCategories(false);
            setViewAllCategory(null);
            setSelectedCategoryId(null);
            setSelectedGenreCategory(null);
            setSelectedProviderGenre(null);
            setIsMergedFilter(false);
            setIsGlobalSearch(true);
            setSearchQuery(q);
            setPage(1);

            saveNavigationState({
              activeProviderValue: activeProvider?.value,
              activeFilter: "",
              searchQuery: q,
              isGlobalSearch: true,
              page: 1,
              selectedPost: null,
              details: null,
              streams: [],
              playbackUrl: null,
              activeNavTab: "home",
              activeCustomPage: null,
              isBrowsingCategories: false,
              viewAllCategory: null,
              selectedNicheId: null,
            });

            const newUrl = `${window.location.pathname}?q=${encodeURIComponent(q)}&global=1`;
            window.history.replaceState({ q, global: "1" }, "", newUrl);
          }}
        />
      )}

      {/* 5b. Cast / Person Details Page */}
      {selectedPersonId && (
        <PersonDetailsModal
          personId={selectedPersonId}
          onClose={handleClosePerson}
          onSelectMedia={(post) => {
            handleSelectPost(post);
            handleClosePerson();
          }}
          activeProviderKey={activeProvider?.value || "hdhub4u"}
          activeProvider={activeProvider}
          providers={installedProviders}
          onSelectProvider={(p) => {
            handleSelectProvider(p);
            handleClosePerson();
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            handleClosePerson();
          }}
          isGlobalSearch={isGlobalSearch}
          onToggleGlobalSearch={() => setIsGlobalSearch(!isGlobalSearch)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onGoHome={() => {
            handleBackToHome();
            handleClosePerson();
          }}
          onSelectCategoryNav={(type) => {
            handleSelectCategoryNav(type);
            handleClosePerson();
          }}
          activeNavTab={activeNavTab}
          onNavigateTab={handleSelectCategoryNav}
        />
      )}

      {/* 6. Download Manager Modal */}
      <DownloadManagerModal
        isOpen={downloadManagerOpen}
        onClose={() => setDownloadManagerOpen(false)}
      />

      {/* 7. Settings Full-Page View */}
      {settingsModalOpen && (
        <SettingsPage
          onClose={() => setSettingsModalOpen(false)}
          currentBackdrop={
            ambientBackdrop ||
            heroPost?.backdropUrl ||
            heroPost?.image ||
            heroCandidatePosts[0]?.backdropUrl ||
            heroCandidatePosts[0]?.image ||
            null
          }
          backdropSlides={activeSectionSlides}
        />
      )}

      {/* 8. Direct In-App Auto-Updater Modal */}
      <UpdateModal />

      {/* 9. Video Player Modal */}
      {(playerModalState || playbackUrl) && (
        <VideoPlayerModal
          playbackUrl={playerModalState?.url || playbackUrl}
          title={playerModalState?.title || selectedPost?.title || details?.title || "Cinema Stream"}
          backdrop={playerModalState?.backdrop || details?.backdrop || selectedPost?.image}
          poster={playerModalState?.poster || details?.poster || selectedPost?.image}
          logo={(details as any)?.logoUrl || (details as any)?.logo || (playerModalState as any)?.logo}
          servers={playerModalState?.servers || streams}
          runtime={playerModalState?.runtime || details?.runtime}
          season={playerModalState?.season}
          episode={playerModalState?.episode}
          episodes={playerModalState?.episodes}
          seasonsCount={playerModalState?.seasonsCount}
          tmdbId={playerModalState?.tmdbId || (selectedPost as any)?.tmdbId || (details as any)?.id}
          initialTime={playerModalState?.initialTime}
          post={playerModalState?.post || selectedPost}
          onSelectEpisode={(seasonNum, episodeNum) => {
            setPlayerModalState((prev: any) =>
              prev ? { ...prev, season: seasonNum, episode: episodeNum } : null
            );
          }}
          onSelectMedia={(media) => {
            handleClosePlayer();
            handleSelectPost({
              id: String(media.id),
              title: media.title || media.name || "Movie",
              image: media.poster_path
                ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
                : media.backdrop_path
                ? `https://image.tmdb.org/t/p/w780${media.backdrop_path}`
                : "",
              tmdbId: media.id,
              type: media.media_type || (media.first_air_date ? "tv" : "movie"),
              releaseDate: media.release_date || media.first_air_date,
              rating: media.vote_average ? `${media.vote_average.toFixed(1)}/10` : undefined,
            } as any);
          }}
          onClose={handleClosePlayer}
        />
      )}

      {/* 10. Continue Watching Modal */}
      <ContinueWatchingModal
        isOpen={continueWatchingModalOpen}
        onClose={() => setContinueWatchingModalOpen(false)}
        onResume={handleResumeContinueWatching}
      />
    </>
  );
};

export default AppModals;
