import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Host, LoadingIndicator } from '@expo/ui/jetpack-compose';
import { size as indicatorSize } from '@expo/ui/jetpack-compose/modifiers';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTmdbStory } from '../../../lib/hooks/useTmdbStory';
import type {
  TmdbStoryCollectionItem,
  TmdbStoryData,
} from '../../../lib/hooks/useTmdbStory';
import { useM3Colors, useM3HostTheme } from '../../../theme/M3PaletteContext';
import AppText from '../../../components/ui/Text';

interface InfoStoryModalProps {
  fallbackBackdrop?: string;
  fallbackOverview?: string;
  fallbackTitle?: string;
  imdbId?: string;
  onClose: () => void;
  tmdbId?: number | string;
  type?: string;
  visible: boolean;
}

interface StoryPage {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  key: string;
  title: string;
}

const getTmdbImage = (
  path?: string,
  size: 'w342' | 'w780' | 'original' = 'w780',
): string | undefined => {
  if (!path) {
    return undefined;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

const formatCount = (value?: number): string | undefined => {
  if (!value) {
    return undefined;
  }
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(value);
};

const formatCurrency = (value?: number): string | undefined => {
  if (!value && value !== 0) {
    return undefined;
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const formatted = (value / 1_000_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return `$${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const formatted = (value / 1_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return `$${formatted}M`;
  }
  if (abs >= 1_000) {
    const formatted = (value / 1_000).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return `$${formatted}K`;
  }
  return `$${value.toLocaleString('en-US')}`;
};

const formatRuntime = (minutes?: number): string | undefined => {
  if (!minutes) {
    return undefined;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
};

const formatRating = (value?: number | string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) {
    return undefined;
  }
  return num.toFixed(1);
};

const SectionHeading = ({
  icon,
  title,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
}) => {
  const colors = useM3Colors();

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        marginBottom: 18,
      }}>
      <MaterialCommunityIcons name={icon} size={26} color={colors.primary} />
      <AppText role="titleLargeEmphasized" style={{ color: colors.onBackground }}>
        {title}
      </AppText>
    </View>
  );
};

const ChipList = ({ items }: { items: string[] }) => {
  const colors = useM3Colors();

  if (!items.length) {
    return null;
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => (
        <View
          key={item}
          style={{
            backgroundColor: colors.surfaceContainerHigh,
            borderColor: colors.outlineVariant,
            borderRadius: 16,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}>
          <AppText
            role="labelMediumEmphasized"
            style={{ color: colors.onSurface }}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
};

const AboutPage = ({
  data,
  fallbackBackdrop,
  fallbackOverview,
  fallbackTitle,
}: {
  data: TmdbStoryData;
  fallbackBackdrop?: string;
  fallbackOverview?: string;
  fallbackTitle?: string;
}) => {
  const colors = useM3Colors();
  const backdropChoices = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(data.backdropPaths ?? []).map(path => getTmdbImage(path)),
            fallbackBackdrop,
          ].filter(Boolean),
        ),
      ) as string[],
    [data.backdropPaths, fallbackBackdrop],
  );
  const [backdropIndex, setBackdropIndex] = useState(0);
  const backdrop = backdropChoices[backdropIndex];

  useEffect(() => {
    setBackdropIndex(0);
    if (backdropChoices.length < 2) {
      return;
    }
    const timer = setInterval(() => {
      setBackdropIndex(index => (index + 1) % backdropChoices.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [backdropChoices]);

  return (
    <>
      {backdrop ? (
        <Image
          key={backdrop}
          fadeDuration={500}
          source={{ uri: backdrop }}
          resizeMode="cover"
          style={{
            aspectRatio: 16 / 9,
            backgroundColor: colors.surfaceContainer,
            borderRadius: 28,
            width: '100%',
          }}
        />
      ) : null}
      <AppText
        role="headlineLargeEmphasized"
        style={{ color: colors.onBackground, marginTop: 24 }}>
        {data.title || fallbackTitle}
      </AppText>
      {data.tagline ? (
        <AppText
          role="titleMedium"
          style={{ color: colors.primary, marginTop: 7 }}>
          {data.tagline}
        </AppText>
      ) : null}
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {formatRating(data.rating) ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#f5c518',
              borderRadius: 12,
              flexDirection: 'row',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}>
            <MaterialCommunityIcons name="star" size={16} color="#000000" />
            <AppText
              role="labelLargeEmphasized"
              style={{ color: '#000000', fontWeight: 'bold' }}>
              {formatRating(data.rating)}
              {data.voteCount ? ` (${formatCount(data.voteCount)})` : ''}
            </AppText>
          </View>
        ) : null}
        {data.metascore ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: 12,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}>
            <MaterialCommunityIcons
              name="pound"
              size={16}
              color={colors.primary}
            />
            <AppText
              role="labelLargeEmphasized"
              style={{ color: colors.onSurface }}>
              {data.metascore} Metascore
            </AppText>
          </View>
        ) : null}
        {data.trendingRank ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: 12,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}>
            <MaterialCommunityIcons
              name="trending-up"
              size={16}
              color={colors.primary}
            />
            <AppText
              role="labelLargeEmphasized"
              style={{ color: colors.onSurface }}>
              #{data.trendingRank}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 34 }}>
        <SectionHeading icon="movie-open-outline" title="What's it about" />
        <AppText
          role="titleLarge"
          style={{
            color: colors.onSurfaceVariant,
            fontSize: 20,
            lineHeight: 30,
          }}>
          {data.overview || fallbackOverview || 'No overview is available.'}
        </AppText>
      </View>
    </>
  );
};

const TrailerPage = ({
  active,
  data,
  onInteract,
}: {
  active: boolean;
  data: TmdbStoryData;
  onInteract?: () => void;
}) => {
  const colors = useM3Colors();
  const trailers = useMemo(() => {
    if (data.trailers && data.trailers.length > 0) return data.trailers;
    if (data.trailerUrl)
      return [
        {
          id: 'primary-mp4',
          name: data.trailerName,
          url: data.trailerUrl,
          thumbnail: data.trailerThumbnail,
        },
      ];
    if (data.trailerKey)
      return [
        { id: 'primary-yt', name: data.trailerName, youtubeKey: data.trailerKey },
      ];
    return [];
  }, [data]);

  const [activeTrailerIndex, setActiveTrailerIndex] = useState(0);
  const activeVideo = trailers[activeTrailerIndex] ?? trailers[0];

  const youtubeOrigin = 'https://vega.app';
  const trailerUrl = activeVideo?.youtubeKey
    ? `https://www.youtube.com/embed/${encodeURIComponent(
      activeVideo.youtubeKey,
    )}?playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(
      youtubeOrigin,
    )}`
    : '';
  const youtubeUrl = activeVideo?.youtubeKey
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(
      activeVideo.youtubeKey,
    )}`
    : activeVideo?.url || '';

  const playerHtml = activeVideo?.url
    ? `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
    <style>
      html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      video { width: 100%; height: 100%; object-fit: contain; }
    </style>
  </head>
  <body>
    <video src="${activeVideo.url}" poster="${activeVideo.thumbnail || ''}" controls playsinline></video>
  </body>
</html>`
    : `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
    <style>
      html, body, iframe { width: 100%; height: 100%; margin: 0; padding: 0; border: 0; overflow: hidden; background: #000; }
    </style>
  </head>
  <body>
    <iframe
      src="${trailerUrl}"
      title="Trailer"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen>
    </iframe>
  </body>
</html>`;

  return (
    <>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}>
        <SectionHeading
          icon="movie-play-outline"
          title={
            trailers.length > 1
              ? `Trailer (${activeTrailerIndex + 1}/${trailers.length})`
              : 'Trailer'
          }
        />
        {trailers.length > 1 ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPressIn={onInteract}
              onPress={() => {
                onInteract?.();
                setActiveTrailerIndex(prev =>
                  prev > 0 ? prev - 1 : trailers.length - 1,
                );
              }}
              style={{
                alignItems: 'center',
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
                borderRadius: 20,
                borderWidth: 1,
                height: 36,
                justifyContent: 'center',
                width: 36,
              }}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={colors.onSurface}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPressIn={onInteract}
              onPress={() => {
                onInteract?.();
                setActiveTrailerIndex(prev =>
                  prev < trailers.length - 1 ? prev + 1 : 0,
                );
              }}
              style={{
                alignItems: 'center',
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
                borderRadius: 20,
                borderWidth: 1,
                height: 36,
                justifyContent: 'center',
                width: 36,
              }}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={colors.onSurface}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      <View
        onTouchEnd={event => event.stopPropagation()}
        onTouchStart={event => event.stopPropagation()}
        style={{
          aspectRatio: 16 / 9,
          backgroundColor: '#000000',
          borderColor: colors.outlineVariant,
          borderRadius: 24,
          borderWidth: 1,
          overflow: 'hidden',
          width: '100%',
        }}>
        {active ? (
          <WebView
            key={activeVideo?.id || activeVideo?.url || activeVideo?.youtubeKey}
            androidLayerType="hardware"
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            domStorageEnabled
            javaScriptEnabled
            mediaPlaybackRequiresUserAction
            originWhitelist={['https://*', 'http://*']}
            setSupportMultipleWindows={false}
            source={{ baseUrl: `${youtubeOrigin}/`, html: playerHtml }}
            style={{ backgroundColor: '#000000', flex: 1 }}
            thirdPartyCookiesEnabled
          />
        ) : (
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
            }}>
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={72}
              color={colors.primary}
            />
          </View>
        )}
      </View>
      <AppText
        role="titleLargeEmphasized"
        style={{ color: colors.onBackground, marginTop: 22 }}>
        {activeVideo?.name || `${data.title} trailer`}
      </AppText>
      {youtubeUrl ? (
        <View
          onTouchEnd={event => event.stopPropagation()}
          onTouchStart={event => event.stopPropagation()}
          style={{ alignItems: 'center', marginTop: 30, width: '100%' }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open trailer"
            activeOpacity={0.72}
            onPressIn={onInteract}
            onPress={() => {
              onInteract?.();
              Linking.openURL(youtubeUrl);
            }}
            style={{
              alignItems: 'center',
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: 22,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 10,
              paddingHorizontal: 22,
              paddingVertical: 14,
            }}>
            <MaterialCommunityIcons
              name={activeVideo?.youtubeKey ? 'youtube' : 'play-circle-outline'}
              size={22}
              color={activeVideo?.youtubeKey ? '#ff3b30' : colors.primary}
            />
            <AppText
              role="labelLargeEmphasized"
              style={{ color: colors.onSurface }}>
              {activeVideo?.youtubeKey ? 'Open on YouTube' : 'Open Video'}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );
};

const CastPage = ({
  data,
  onInteract,
}: {
  data: TmdbStoryData;
  onInteract?: () => void;
}) => {
  const colors = useM3Colors();

  return (
    <>
      <SectionHeading icon="account-group-outline" title="Cast" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {data.cast.map(person => {
          const image = getTmdbImage(person.profilePath, 'w342');
          return (
            <TouchableOpacity
              key={person.id}
              activeOpacity={0.75}
              onPressIn={onInteract}
              onPress={() => {
                onInteract?.();
                if (
                  typeof person.id === 'string' &&
                  person.id.startsWith('nm')
                ) {
                  Linking.openURL(`https://www.imdb.com/name/${person.id}/`);
                } else if (person.id) {
                  Linking.openURL(
                    `https://www.themoviedb.org/person/${person.id}`,
                  );
                }
              }}
              style={{
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: 22,
                flexBasis: '47%',
                flexGrow: 1,
                overflow: 'hidden',
              }}>
              {image ? (
                <Image
                  source={{ uri: image }}
                  resizeMode="cover"
                  style={{
                    aspectRatio: 0.78,
                    backgroundColor: colors.surfaceContainer,
                    width: '100%',
                  }}
                />
              ) : (
                <View
                  style={{
                    alignItems: 'center',
                    aspectRatio: 0.78,
                    backgroundColor: colors.surfaceContainer,
                    justifyContent: 'center',
                    width: '100%',
                  }}>
                  <MaterialCommunityIcons
                    name="account"
                    size={64}
                    color={colors.outline}
                  />
                </View>
              )}
              <View style={{ padding: 12 }}>
                <AppText
                  role="labelLargeEmphasized"
                  numberOfLines={2}
                  style={{ color: colors.onSurface }}>
                  {person.name}
                </AppText>
                {person.character ? (
                  <AppText
                    role="bodySmall"
                    numberOfLines={2}
                    style={{ color: colors.onSurfaceVariant, marginTop: 3 }}>
                    {person.character}
                  </AppText>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

const BoxOfficePage = ({ data }: { data: TmdbStoryData }) => {
  const colors = useM3Colors();
  const stats = [
    {
      icon: 'currency-usd' as const,
      label: 'Budget',
      value: data.productionBudget,
    },
    {
      icon: 'calendar-outline' as const,
      label: 'Opening Weekend',
      value: data.openingWeekendGross,
    },
    {
      icon: 'chart-bar' as const,
      label: 'Domestic',
      value: data.domesticGross,
    },
    {
      icon: 'earth' as const,
      label: 'Worldwide',
      value: data.worldwideGross,
    },
  ].filter(s => Boolean(s.value));

  const maxValue = Math.max(...stats.map(s => s.value || 0), 1);
  const roi =
    data.productionBudget && data.worldwideGross
      ? (data.worldwideGross / data.productionBudget) * 100 - 100
      : undefined;
  const isProfit = roi !== undefined && roi >= 0;

  return (
    <>
      <SectionHeading icon="currency-usd" title="Box Office" />
      <View
        style={{
          backgroundColor: colors.surfaceContainerLow,
          borderColor: colors.outlineVariant,
          borderRadius: 22,
          borderWidth: 1,
          gap: 14,
          padding: 18,
        }}>
        {stats.map(item => {
          const pct =
            maxValue > 0 && item.value
              ? Math.max(Math.round((item.value / maxValue) * 100), 4)
              : 0;
          return (
            <View
              key={item.label}
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: 12,
                justifyContent: 'space-between',
              }}>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  width: 145,
                }}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={colors.primary}
                />
                <AppText
                  numberOfLines={1}
                  role="labelMediumEmphasized"
                  style={{ color: colors.onSurfaceVariant }}>
                  {item.label}
                </AppText>
              </View>
              <View
                style={{
                  backgroundColor: colors.surfaceContainer,
                  borderRadius: 4,
                  flex: 1,
                  height: 6,
                  marginHorizontal: 8,
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 4,
                    height: '100%',
                    width: `${pct}%`,
                  }}
                />
              </View>
              <AppText
                role="titleMediumEmphasized"
                style={{
                  color: colors.onSurface,
                  minWidth: 70,
                  textAlign: 'right',
                }}>
                {formatCurrency(item.value)}
              </AppText>
            </View>
          );
        })}
      </View>

      {roi !== undefined && (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.surfaceContainerLow,
            borderColor: colors.outlineVariant,
            borderRadius: 22,
            borderWidth: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 14,
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}>
          <AppText
            role="titleMediumEmphasized"
            style={{ color: colors.onSurface }}>
            Return on Investment
          </AppText>
          <AppText
            role="headlineMediumEmphasized"
            style={{
              color: isProfit ? '#22c55e' : '#ef4444',
              fontWeight: 'bold',
            }}>
            {isProfit ? `+${roi.toFixed(0)}%` : `${roi.toFixed(0)}%`}
          </AppText>
        </View>
      )}
    </>
  );
};

const FactCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) => {
  const colors = useM3Colors();

  return (
    <View
      style={{
        backgroundColor: colors.surfaceContainerLow,
        borderColor: colors.outlineVariant,
        borderRadius: 20,
        borderWidth: 1,
        flexBasis: '47%',
        flexGrow: 1,
        minHeight: 108,
        padding: 16,
      }}>
      <MaterialCommunityIcons name={icon} size={26} color={colors.primary} />
      <AppText
        role="titleMediumEmphasized"
        style={{ color: colors.onSurface, marginTop: 12 }}>
        {value}
      </AppText>
      <AppText
        role="bodySmall"
        style={{ color: colors.onSurfaceVariant, marginTop: 3 }}>
        {label}
      </AppText>
    </View>
  );
};

const FactsPage = ({ data }: { data: TmdbStoryData }) => {
  const colors = useM3Colors();
  const facts = [
    data.trendingRank
      ? {
        icon: 'trending-up' as const,
        label: 'Trending this week',
        value: `#${data.trendingRank}`,
      }
      : null,
    formatRating(data.rating)
      ? {
        icon: 'star-outline' as const,
        label: `${formatCount(data.voteCount) || 'TMDB'} votes`,
        value: `${formatRating(data.rating)}/10`,
      }
      : null,
    data.metascore
      ? {
        icon: 'pound' as const,
        label: 'Metascore',
        value: `${data.metascore}`,
      }
      : null,
    data.certification
      ? {
        icon: 'shield-outline' as const,
        label: 'Content rating',
        value: data.certification,
      }
      : null,
    data.releaseDate
      ? {
        icon: 'calendar-blank-outline' as const,
        label: 'Released',
        value: data.releaseDate.slice(0, 4),
      }
      : null,
    data.runtime
      ? {
        icon: 'clock-outline' as const,
        label: data.mediaType === 'tv' ? 'Episode runtime' : 'Runtime',
        value: formatRuntime(data.runtime) || '',
      }
      : null,
    data.status
      ? {
        icon: 'information-outline' as const,
        label: 'Status',
        value: data.status,
      }
      : null,
    data.watchlistCount
      ? {
        icon: 'account-group-outline' as const,
        label: 'Watchlist',
        value: data.watchlistCount.replace('Added by ', ''),
      }
      : null,
    data.totalSeasons
      ? {
        icon: 'television' as const,
        label: 'Seasons',
        value: `${data.totalSeasons} ${data.totalSeasons === 1 ? 'season' : 'seasons'}`,
      }
      : null,
    data.totalEpisodes
      ? {
        icon: 'television-play' as const,
        label: 'Episodes',
        value: `${data.totalEpisodes} ${data.totalEpisodes === 1 ? 'episode' : 'episodes'}`,
      }
      : null,
    data.upcomingSeason
      ? {
        icon: 'calendar-clock' as const,
        label: 'Upcoming',
        value: data.upcomingSeason,
      }
      : null,
  ].filter(Boolean) as {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    value: string;
  }[];

  return (
    <>
      <SectionHeading icon="chart-box-outline" title="Ratings & facts" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {facts.map(fact => (
          <FactCard
            key={`${fact.label}-${fact.value}`}
            icon={fact.icon}
            label={fact.label}
            value={fact.value}
          />
        ))}
      </View>

      {data.awardsText ? (
        <View style={{ marginTop: 26 }}>
          <AppText
            role="titleMediumEmphasized"
            style={{ color: colors.onBackground, marginBottom: 8 }}>
            Awards
          </AppText>
          <View
            style={{
              backgroundColor: colors.surfaceContainerLow,
              borderColor: colors.outlineVariant,
              borderRadius: 18,
              borderWidth: 1,
              padding: 14,
            }}>
            <AppText role="bodyMedium" style={{ color: colors.onSurface }}>
              {data.awardsText}
            </AppText>
          </View>
        </View>
      ) : null}

      {data.creators.length ? (
        <View style={{ marginTop: 30 }}>
          <AppText
            role="titleMediumEmphasized"
            style={{ color: colors.onBackground, marginBottom: 10 }}>
            {data.mediaType === 'tv' ? 'Created by' : 'Directed by'}
          </AppText>
          <ChipList items={data.creators} />
        </View>
      ) : null}
      {data.genres.length ? (
        <View style={{ marginTop: 26 }}>
          <AppText
            role="titleMediumEmphasized"
            style={{ color: colors.onBackground, marginBottom: 10 }}>
            Genres
          </AppText>
          <ChipList items={data.genres} />
        </View>
      ) : null}
      {data.keywords.length ? (
        <View style={{ marginTop: 26 }}>
          <AppText
            role="titleMediumEmphasized"
            style={{ color: colors.onBackground, marginBottom: 10 }}>
            Themes
          </AppText>
          <ChipList items={data.keywords} />
        </View>
      ) : null}
      {data.companies.length || data.networks.length ? (
        <View style={{ marginTop: 26 }}>
          <AppText
            role="titleMediumEmphasized"
            style={{ color: colors.onBackground, marginBottom: 8 }}>
            Studios & networks
          </AppText>
          <AppText
            role="bodyMedium"
            style={{
              color: colors.onSurfaceVariant,
              lineHeight: 22,
            }}>
            {[...data.networks, ...data.companies].slice(0, 6).join(' · ')}
          </AppText>
        </View>
      ) : null}
      {data.countries.length || data.originalLanguage ? (
        <AppText
          role="bodyMedium"
          style={{
            color: colors.outline,
            lineHeight: 22,
            marginTop: 22,
          }}>
          {[...data.countries, data.originalLanguage]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      ) : null}
    </>
  );
};

const CollectionRow = ({ item }: { item: TmdbStoryCollectionItem }) => {
  const colors = useM3Colors();
  const image = getTmdbImage(item.imagePath, 'w342');

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: 22,
        flexDirection: 'row',
        marginBottom: 12,
        minHeight: 118,
        overflow: 'hidden',
      }}>
      {image ? (
        <Image
          source={{ uri: image }}
          resizeMode="cover"
          style={{
            alignSelf: 'stretch',
            backgroundColor: colors.surfaceContainer,
            width: 82,
          }}
        />
      ) : (
        <View
          style={{
            alignItems: 'center',
            alignSelf: 'stretch',
            backgroundColor: colors.surfaceContainer,
            justifyContent: 'center',
            width: 82,
          }}>
          <MaterialCommunityIcons
            name="movie-open-outline"
            size={34}
            color={colors.outline}
          />
        </View>
      )}
      <View style={{ flex: 1, padding: 16 }}>
        <AppText role="titleMediumEmphasized" style={{ color: colors.onSurface }}>
          {item.title}
        </AppText>
        {item.subtitle ? (
          <AppText
            role="bodyMedium"
            style={{ color: colors.onSurfaceVariant, marginTop: 5 }}>
            {item.subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const RelatedPage = ({
  data,
  onInteract,
}: {
  data: TmdbStoryData;
  onInteract?: () => void;
}) => {
  const colors = useM3Colors();

  return (
    <>
      <SectionHeading icon="movie-filter-outline" title="Recommendations" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {(data.relatedTitles ?? []).map(item => {
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.75}
              onPressIn={onInteract}
              onPress={() => {
                onInteract?.();
                if (item.id) {
                  Linking.openURL(`https://www.imdb.com/title/${item.id}/`);
                }
              }}
              style={{
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: 22,
                flexBasis: '47%',
                flexGrow: 1,
                overflow: 'hidden',
              }}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  resizeMode="cover"
                  style={{
                    aspectRatio: 0.72,
                    backgroundColor: colors.surfaceContainer,
                    width: '100%',
                  }}
                />
              ) : (
                <View
                  style={{
                    alignItems: 'center',
                    aspectRatio: 0.72,
                    backgroundColor: colors.surfaceContainer,
                    justifyContent: 'center',
                    width: '100%',
                  }}>
                  <MaterialCommunityIcons
                    name="movie-open-outline"
                    size={64}
                    color={colors.outline}
                  />
                </View>
              )}
              <View style={{ padding: 12 }}>
                <AppText
                  role="labelLargeEmphasized"
                  numberOfLines={2}
                  style={{ color: colors.onSurface }}>
                  {item.title}
                </AppText>
                {formatRating(item.rating) ? (
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 4,
                      marginTop: 4,
                    }}>
                    <MaterialCommunityIcons
                      name="star"
                      size={14}
                      color="#f5c518"
                    />
                    <AppText
                      role="labelMediumEmphasized"
                      style={{ color: colors.onSurfaceVariant }}>
                      {formatRating(item.rating)}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

const RatingsPage = ({
  data,
  onInteract,
}: {
  data: TmdbStoryData;
  onInteract?: () => void;
}) => {
  const colors = useM3Colors();
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);
  const histogram = data.ratingsHistogram ?? [];
  const maxVotes = Math.max(...histogram.map(h => h.voteCount), 1);
  const voteCountFormatted = formatCount(data.voteCount);

  return (
    <>
      <SectionHeading icon="chart-bar" title="User reviews" />

      {/* Ratings & Histogram Card */}
      <View
        style={{
          backgroundColor: colors.surfaceContainerLow,
          borderColor: colors.outlineVariant,
          borderRadius: 22,
          borderWidth: 1,
          marginBottom: 16,
          padding: 18,
        }}>
        {/* Rating summary: Big Star + Score + Votes */}
        {formatRating(data.rating) ? (
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 12,
              marginBottom: 16,
            }}>
            <MaterialCommunityIcons name="star" size={38} color="#f5c518" />
            <View>
              <View
                style={{ alignItems: 'baseline', flexDirection: 'row', gap: 4 }}>
                <AppText
                  role="headlineMediumEmphasized"
                  style={{ color: colors.onSurface }}>
                  {formatRating(data.rating)}
                </AppText>
                <AppText
                  role="titleSmall"
                  style={{ color: colors.onSurfaceVariant }}>
                  /10
                </AppText>
              </View>
              {voteCountFormatted ? (
                <AppText
                  role="bodySmall"
                  style={{ color: colors.onSurfaceVariant }}>
                  {voteCountFormatted} votes
                </AppText>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* 10-bar Histogram */}
        {histogram.length > 0 ? (
          <View
            style={{
              alignItems: 'flex-end',
              flexDirection: 'row',
              gap: 6,
              height: 110,
              paddingTop: 10,
            }}>
            {histogram.map(entry => {
              const pct = maxVotes > 0 ? (entry.voteCount / maxVotes) * 100 : 0;
              return (
                <View
                  key={entry.rating}
                  style={{
                    alignItems: 'center',
                    flex: 1,
                    gap: 6,
                    height: '100%',
                  }}>
                  <View
                    style={{
                      alignItems: 'flex-end',
                      backgroundColor: colors.surfaceContainer,
                      borderRadius: 4,
                      flex: 1,
                      justifyContent: 'flex-end',
                      overflow: 'hidden',
                      width: '100%',
                    }}>
                    <View
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: 4,
                        height: `${Math.max(pct, 4)}%`,
                        width: '100%',
                      }}
                    />
                  </View>
                  <AppText
                    role="labelSmall"
                    style={{
                      color: colors.onSurfaceVariant,
                      fontSize: 11,
                      fontWeight: '600',
                    }}>
                    {entry.rating}
                  </AppText>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Featured Review */}
      {data.featuredReview ? (
        <View
          style={{
            backgroundColor: colors.surfaceContainerLow,
            borderColor: colors.outlineVariant,
            borderRadius: 22,
            borderWidth: 1,
            gap: 10,
            padding: 18,
          }}>
          <AppText
            role="labelMediumEmphasized"
            style={{
              color: colors.primary,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>
            Featured Review
          </AppText>

          {data.featuredReview.rating ? (
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: 4,
              }}>
              <MaterialCommunityIcons name="star" size={16} color="#f5c518" />
              <AppText
                role="labelLargeEmphasized"
                style={{ color: colors.onSurface }}>
                {data.featuredReview.rating}/10
              </AppText>
            </View>
          ) : null}

          {data.featuredReview.summary ? (
            <AppText
              role="titleMediumEmphasized"
              style={{ color: colors.onSurface }}>
              {data.featuredReview.summary}
            </AppText>
          ) : null}

          {data.featuredReview.text ? (
            <AppText
              role="bodyMedium"
              numberOfLines={isReviewExpanded ? undefined : 6}
              style={{ color: colors.onSurfaceVariant, lineHeight: 20 }}>
              {data.featuredReview.text}
            </AppText>
          ) : null}

          {data.featuredReview.text && data.featuredReview.text.length > 200 ? (
            <TouchableOpacity
              onPressIn={onInteract}
              onPress={() => {
                onInteract?.();
                setIsReviewExpanded(prev => !prev);
              }}
              activeOpacity={0.7}>
              <AppText
                role="labelLargeEmphasized"
                style={{ color: colors.primary }}>
                {isReviewExpanded ? 'Show less' : 'Read more'}
              </AppText>
            </TouchableOpacity>
          ) : null}

          {data.featuredReview.author ? (
            <AppText
              role="bodySmall"
              style={{ color: colors.onSurfaceVariant, opacity: 0.8 }}>
              By {data.featuredReview.author}
              {data.featuredReview.date ? ` • ${data.featuredReview.date}` : ''}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </>
  );
};

const CollectionPage = ({ data }: { data: TmdbStoryData }) => (
  <>
    <SectionHeading
      icon={
        data.mediaType === 'tv'
          ? 'television-classic'
          : 'filmstrip-box-multiple'
      }
      title={
        data.collectionTitle ||
        (data.mediaType === 'tv' ? 'Seasons' : 'Collection')
      }
    />
    {data.collectionItems.map(item => (
      <CollectionRow key={item.id} item={item} />
    ))}
  </>
);

const InfoStoryModal = ({
  fallbackBackdrop,
  fallbackOverview,
  fallbackTitle,
  imdbId,
  onClose,
  tmdbId,
  type,
  visible,
}: InfoStoryModalProps) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pageIndex, setPageIndex] = useState(0);
  const storyListRef = useRef<FlatList<StoryPage>>(null);
  const touchStart = useRef<{ time: number; x: number; y: number } | undefined>(
    undefined,
  );
  const isInteractingRef = useRef(false);
  const handleInteract = useCallback(() => {
    isInteractingRef.current = true;
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 400);
  }, []);

  const { data, error, isFetching, refetch } = useTmdbStory({
    enabled: visible,
    imdbId,
    tmdbId,
    type,
  });
  const pages = useMemo<StoryPage[]>(() => {
    const items: StoryPage[] = [
      { icon: 'movie-open-outline', key: 'about', title: 'About' },
    ];
    if (data?.trailers?.length || data?.trailerKey || data?.trailerUrl) {
      items.push({
        icon: 'movie-play-outline',
        key: 'trailer',
        title: 'Trailer',
      });
    }
    if (data?.cast.length) {
      items.push({
        icon: 'account-group-outline',
        key: 'cast',
        title: 'Cast',
      });
    }
    if (
      data?.productionBudget ||
      data?.worldwideGross ||
      data?.domesticGross ||
      data?.openingWeekendGross
    ) {
      items.push({
        icon: 'currency-usd',
        key: 'boxoffice',
        title: 'Box Office',
      });
    }
    if (data?.ratingsHistogram?.length || data?.featuredReview) {
      items.push({
        icon: 'chart-bar',
        key: 'ratings',
        title: 'Reviews',
      });
    }
    items.push({ icon: 'chart-box-outline', key: 'facts', title: 'Facts' });
    if (data?.relatedTitles?.length) {
      items.push({
        icon: 'movie-filter-outline',
        key: 'related',
        title: 'Recommendations',
      });
    }
    if (data?.collectionItems.length) {
      items.push({
        icon:
          data.mediaType === 'tv'
            ? 'television-classic'
            : 'filmstrip-box-multiple',
        key: 'collection',
        title: data.mediaType === 'tv' ? 'Seasons' : 'Collection',
      });
    }
    return items;
  }, [data]);

  useEffect(() => {
    if (visible) {
      setPageIndex(0);
    }
  }, [visible]);

  const goToPage = (nextIndex: number) => {
    setPageIndex(nextIndex);
    storyListRef.current?.scrollToOffset({
      animated: true,
      offset: nextIndex * width,
    });
  };

  const handleStoryTap = (x: number) => {
    if (x >= width / 2) {
      if (pageIndex >= pages.length - 1) {
        onClose();
        return;
      }
      goToPage(pageIndex + 1);
      return;
    }

    if (pageIndex > 0) {
      goToPage(pageIndex - 1);
    }
  };

  const renderPage = ({ item }: { item: StoryPage }) => {
    if (!data) {
      return null;
    }
    return (
      <ScrollView
        style={{ width }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 48,
          paddingHorizontal: 20,
          paddingTop: 86,
        }}>
        {item.key === 'about' ? (
          <AboutPage
            data={data}
            fallbackBackdrop={fallbackBackdrop}
            fallbackOverview={fallbackOverview}
            fallbackTitle={fallbackTitle}
          />
        ) : item.key === 'trailer' ? (
          <TrailerPage
            active={pageIndex === pages.indexOf(item)}
            data={data}
            onInteract={handleInteract}
          />
        ) : item.key === 'cast' ? (
          <CastPage data={data} onInteract={handleInteract} />
        ) : item.key === 'boxoffice' ? (
          <BoxOfficePage data={data} />
        ) : item.key === 'ratings' ? (
          <RatingsPage data={data} onInteract={handleInteract} />
        ) : item.key === 'related' ? (
          <RelatedPage data={data} onInteract={handleInteract} />
        ) : item.key === 'collection' ? (
          <CollectionPage data={data} />
        ) : (
          <FactsPage data={data} />
        )}
      </ScrollView>
    );
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}>
      <SafeAreaView
        edges={['top', 'bottom']}
        onTouchCancel={() => {
          touchStart.current = undefined;
        }}
        onTouchEnd={event => {
          const start = touchStart.current;
          touchStart.current = undefined;
          if (isInteractingRef.current) {
            isInteractingRef.current = false;
            return;
          }
          if (!data || !start) {
            return;
          }
          const { pageX, pageY, timestamp } = event.nativeEvent;
          const isTap =
            Math.abs(pageX - start.x) <= 12 &&
            Math.abs(pageY - start.y) <= 12 &&
            timestamp - start.time <= 500;
          const isBelowStoryHeader = pageY > insets.top + 58;
          if (isTap && isBelowStoryHeader) {
            handleStoryTap(pageX);
          }
        }}
        onTouchStart={event => {
          const { pageX, pageY, timestamp } = event.nativeEvent;
          touchStart.current = { time: timestamp, x: pageX, y: pageY };
        }}
        style={{ backgroundColor: colors.background, flex: 1 }}>
        <StatusBar style="light" />
        <View
          pointerEvents="none"
          style={{
            backgroundColor: colors.primary,
            borderRadius: 260,
            height: 520,
            left: -150,
            opacity: 0.07,
            position: 'absolute',
            top: -180,
            width: 520,
          }}
        />

        {data ? (
          <FlatList
            key={`${data.id}-${visible}`}
            ref={storyListRef}
            data={pages}
            extraData={pageIndex}
            horizontal
            pagingEnabled
            bounces={false}
            keyExtractor={item => item.key}
            renderItem={renderPage}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event => {
              setPageIndex(
                Math.round(event.nativeEvent.contentOffset.x / width),
              );
            }}
          />
        ) : (
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              padding: 28,
            }}>
            {isFetching ? (
              <Host matchContents {...hostTheme}>
                <LoadingIndicator
                  color={colors.primary}
                  modifiers={[indicatorSize(56, 56)]}
                />
              </Host>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="book-alert-outline"
                  size={54}
                  color={colors.error}
                />
                <AppText
                  role="titleLargeEmphasized"
                  style={{
                    color: colors.onSurface,
                    marginTop: 18,
                    textAlign: 'center',
                  }}>
                  Story unavailable
                </AppText>
                <AppText
                  role="bodyMedium"
                  style={{
                    color: colors.onSurfaceVariant,
                    marginTop: 8,
                    textAlign: 'center',
                  }}>
                  {error instanceof Error
                    ? error.message
                    : 'TMDB metadata could not be loaded.'}
                </AppText>
                <Pressable
                  onPress={() => refetch()}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 24,
                    marginTop: 22,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                  }}>
                  <AppText
                    role="labelLargeEmphasized"
                    style={{ color: colors.onPrimary }}>
                    Try again
                  </AppText>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            gap: 7,
            left: 20,
            position: 'absolute',
            right: 74,
            top: insets.top + 14,
          }}>
          {pages.map((page, index) => (
            <View
              key={page.key}
              style={{
                backgroundColor:
                  index === pageIndex ? colors.primary : colors.outlineVariant,
                borderRadius: 2,
                flex: 1,
                height: 6,
                opacity: index < pageIndex ? 0.65 : 1,
              }}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close story"
          hitSlop={10}
          onPress={onClose}
          style={{
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            position: 'absolute',
            right: 10,
            top: insets.top - 1,
            width: 48,
          }}>
          <MaterialCommunityIcons
            name="close"
            size={34}
            color={colors.onBackground}
          />
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
};

export default InfoStoryModal;
