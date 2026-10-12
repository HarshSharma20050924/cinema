import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';
import type {WatchListStackParamList} from '../App';
import MediaPosterCard from '../components/MediaPosterCard';
import AppText from '../components/ui/Text';
import type {WatchListItem} from '../lib/storage';
import {settingsStorage} from '../lib/storage';
import {syncFromSharedFolder} from '../lib/sync/syncService';
import {showAppDialog} from '../lib/zustand/appDialogStore';
import useWatchListStore from '../lib/zustand/watchListStore';
import {useM3Colors} from '../theme/M3PaletteContext';

const WatchList = () => {
  const colors = useM3Colors();
  const navigation =
    useNavigation<NativeStackNavigationProp<WatchListStackParamList>>();
  const watchList = useWatchListStore(state => state.watchList);
  const removeItem = useWatchListStore(state => state.removeItem);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  const isSelectionMode = selectedLinks.size > 0;

  useFocusEffect(
    useCallback(() => {
      syncFromSharedFolder().catch(e =>
        console.warn('[VegaSync] WatchList sync failed:', e),
      );
    }, []),
  );

  const triggerHaptic = (
    type: HapticFeedbackTypes = HapticFeedbackTypes.effectTick,
  ) => {
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger(type, {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
  };

  const handleCardPress = (item: WatchListItem) => {
    if (isSelectionMode) {
      triggerHaptic(HapticFeedbackTypes.effectTick);
      setSelectedLinks(prev => {
        const next = new Set(prev);
        if (next.has(item.link)) {
          next.delete(item.link);
        } else {
          next.add(item.link);
        }
        return next;
      });
    } else {
      navigation.navigate('Info', {
        link: item.link,
        provider: item.provider,
        poster: item.poster,
      });
    }
  };

  const handleCardLongPress = (item: WatchListItem) => {
    triggerHaptic(HapticFeedbackTypes.impactMedium);
    setSelectedLinks(prev => {
      const next = new Set(prev);
      if (next.has(item.link)) {
        next.delete(item.link);
      } else {
        next.add(item.link);
      }
      return next;
    });
  };

  const handleExitSelection = () => {
    triggerHaptic(HapticFeedbackTypes.effectClick);
    setSelectedLinks(new Set());
  };

  const handleToggleSelectAll = () => {
    triggerHaptic(HapticFeedbackTypes.effectClick);
    if (selectedLinks.size === watchList.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(watchList.map(item => item.link)));
    }
  };

  const handleInvertSelection = () => {
    triggerHaptic(HapticFeedbackTypes.effectClick);
    setSelectedLinks(prev => {
      const next = new Set<string>();
      watchList.forEach(item => {
        if (!prev.has(item.link)) {
          next.add(item.link);
        }
      });
      return next;
    });
  };

  const handleDeletePress = () => {
    if (selectedLinks.size === 0) return;

    triggerHaptic(HapticFeedbackTypes.effectHeavyClick);
    const count = selectedLinks.size;

    showAppDialog({
      title: `Remove from Watchlist?`,
      message: `Are you sure you want to remove ${count} ${
        count === 1 ? 'title' : 'titles'
      } from your watchlist?`,
      variant: 'warning',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Remove',
          variant: 'destructive',
          onPress: () => {
            selectedLinks.forEach(link => {
              removeItem(link);
            });
            setSelectedLinks(new Set());
          },
        },
      ],
    });
  };

  const isAllSelected =
    watchList.length > 0 && selectedLinks.size === watchList.length;

  // Calculate how many items can fit per row
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 12;
  const itemSpacing = 10;
  const availableWidth = screenWidth - containerPadding * 2;
  const numColumns = Math.floor(
    (availableWidth + itemSpacing) / (100 + itemSpacing),
  );
  const itemWidth =
    (availableWidth - itemSpacing * (numColumns - 1)) / numColumns;

  return (
    <View className="flex-1 bg-m3-background">
      <StatusBar />

      {/* Top Selection Header Toolbar */}
      {isSelectionMode ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.surfaceContainerHigh,
            borderBottomColor: colors.outlineVariant,
            borderBottomWidth: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingBottom: 12,
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'android' ? 36 : 14,
            zIndex: 10,
          }}>
          <View style={{alignItems: 'center', flexDirection: 'row', gap: 16}}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleExitSelection}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <MaterialCommunityIcons
                name="close"
                size={26}
                color={colors.onSurface}
              />
            </TouchableOpacity>
            <AppText
              role="titleLargeEmphasized"
              style={{color: colors.onSurface}}>
              {selectedLinks.size}
            </AppText>
          </View>

          <View style={{alignItems: 'center', flexDirection: 'row', gap: 12}}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleInvertSelection}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <MaterialCommunityIcons
                name="select-inverse"
                size={24}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleSelectAll}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <MaterialIcons
                name="select-all"
                size={24}
                color={isAllSelected ? colors.primary : colors.onSurface}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View
          className="w-full bg-m3-background"
          style={{
            paddingTop: Platform.OS === 'android' ? 15 : 0,
          }}
        />
      )}

      <View className="flex-1 w-full px-3">
        {!isSelectionMode ? (
          <AppText
            role="headlineLargeEmphasized"
            className="mb-6 mt-4 text-center text-m3-on-background">
            Watchlist
          </AppText>
        ) : null}

        {watchList.length > 0 ? (
          <FlatList
            data={watchList}
            renderItem={({item}) => (
              <MediaPosterCard
                title={item.title}
                poster={item.poster}
                width={itemWidth}
                selected={selectedLinks.has(item.link)}
                selectionMode={isSelectionMode}
                onPress={() => handleCardPress(item)}
                onLongPress={() => handleCardLongPress(item)}
              />
            )}
            keyExtractor={(item, index) => item.link + index}
            numColumns={numColumns}
            columnWrapperStyle={{
              gap: itemSpacing,
              justifyContent: 'flex-start',
            }}
            contentContainerStyle={{
              paddingTop: isSelectionMode ? 14 : 0,
              paddingBottom: isSelectionMode ? 120 : 50,
            }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1">
            <View className="items-center justify-center mt-20 mb-12">
              <MaterialCommunityIcons
                name="bookmark-off-outline"
                size={72}
                color={colors.onSurfaceVariant}
              />
              <AppText
                role="bodyLarge"
                className="mt-4 text-center text-m3-on-surface-variant">
                Your watchlist is empty
              </AppText>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Action Bar in Selection Mode */}
      {isSelectionMode ? (
        <View
          style={{
            bottom: 24,
            left: 16,
            position: 'absolute',
            right: 16,
            zIndex: 20,
          }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.surfaceContainerHighest,
              borderColor: colors.outlineVariant,
              borderRadius: 24,
              borderWidth: 1,
              elevation: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 10,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.35,
              shadowRadius: 10,
            }}>
            <View style={{alignItems: 'center', flexDirection: 'row', gap: 16}}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleToggleSelectAll}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <MaterialIcons
                  name="select-all"
                  size={24}
                  color={isAllSelected ? colors.primary : colors.onSurfaceVariant}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleInvertSelection}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <MaterialCommunityIcons
                  name="select-inverse"
                  size={24}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
              <AppText
                role="labelMediumEmphasized"
                style={{color: colors.onSurfaceVariant}}>
                {selectedLinks.size} selected
              </AppText>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              disabled={selectedLinks.size === 0}
              onPress={handleDeletePress}
              style={{
                alignItems: 'center',
                backgroundColor: colors.errorContainer,
                borderRadius: 16,
                flexDirection: 'row',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={colors.onErrorContainer}
              />
              <AppText
                role="labelLargeEmphasized"
                style={{
                  color: colors.onErrorContainer,
                  fontWeight: '700',
                }}>
                Remove
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default WatchList;
