import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';
import type {DownloadsStackParamList} from '../../App';
import MediaPosterCard from '../../components/MediaPosterCard';
import AppText from '../../components/ui/Text';
import {
  deleteDownloadOutput,
} from '../../lib/downloadDestination';
import {
  createDownloadDirectoryName,
  createDownloadSeasonDirectoryName,
} from '../../lib/downloadId';
import {
  DownloadedMediaGroup,
  groupCompletedDownloads,
} from '../../lib/downloadLibrary';
import {reconcileCompletedDownloadOutputs} from '../../lib/downloadReconciliation';
import {settingsStorage} from '../../lib/storage';
import {syncFromSharedFolder} from '../../lib/sync/syncService';
import {showAppDialog} from '../../lib/zustand/appDialogStore';
import useDownloadsStore, {
  selectCompletedDownloads,
} from '../../lib/zustand/downloadsStore';
import {useM3Colors} from '../../theme/M3PaletteContext';
import CurrentDownloadsSection from '../settings/components/CurrentDownloadsSection';
import MissingDownloadsSection from '../settings/components/MissingDownloadsSection';

const GRID_PADDING = 12;
const GRID_GAP = 10;
const MIN_CARD_WIDTH = 100;

const Downloads = () => {
  const colors = useM3Colors();
  const navigation =
    useNavigation<NativeStackNavigationProp<DownloadsStackParamList>>();
  const completed = useDownloadsStore(selectCompletedDownloads);
  const groups = useMemo(() => groupCompletedDownloads(completed), [completed]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const isSelectionMode = selectedGroupIds.size > 0;
  const availableWidth = Dimensions.get('window').width - GRID_PADDING * 2;
  const columns = Math.max(
    2,
    Math.floor((availableWidth + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP)),
  );
  const cardWidth = (availableWidth - GRID_GAP * (columns - 1)) / columns;

  useFocusEffect(
    useCallback(() => {
      syncFromSharedFolder().catch(error =>
        console.warn('[VegaSync] Downloads sync failed:', error),
      );
      reconcileCompletedDownloadOutputs().catch(error =>
        console.warn('Download library reconciliation failed:', error),
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

  const handleCardPress = (groupId: string) => {
    if (isSelectionMode) {
      triggerHaptic(HapticFeedbackTypes.effectTick);
      setSelectedGroupIds(prev => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    } else {
      navigation.navigate('DownloadedDetails', {groupId});
    }
  };

  const handleCardLongPress = (groupId: string) => {
    triggerHaptic(HapticFeedbackTypes.impactMedium);
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleExitSelection = () => {
    triggerHaptic(HapticFeedbackTypes.effectClick);
    setSelectedGroupIds(new Set());
  };

  const handleToggleSelectAll = () => {
    triggerHaptic(HapticFeedbackTypes.effectClick);
    if (selectedGroupIds.size === groups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(groups.map(g => g.id)));
    }
  };

  const handleInvertSelection = () => {
    triggerHaptic(HapticFeedbackTypes.effectClick);
    setSelectedGroupIds(prev => {
      const next = new Set<string>();
      groups.forEach(g => {
        if (!prev.has(g.id)) {
          next.add(g.id);
        }
      });
      return next;
    });
  };

  const deleteSelectedGroups = async (targetGroups: DownloadedMediaGroup[]) => {
    setIsDeleting(true);
    try {
      const allDownloads = Object.values(useDownloadsStore.getState().downloads);
      const removeDownload = useDownloadsStore.getState().removeDownload;

      for (const group of targetGroups) {
        for (const item of group.items) {
          const subItems = allDownloads.filter(
            d =>
              d.id.startsWith(`${item.id}_subtitle_`) ||
              (d.infoUrl === item.infoUrl &&
                d.sourceLink === item.sourceLink &&
                (d.isSubtitle || d.id.includes('_subtitle_'))),
          );

          for (const subItem of subItems) {
            if (subItem.filePath) {
              await deleteDownloadOutput(subItem.filePath, {
                downloadLocation: subItem.downloadLocation,
                outputDirectoryNames: [
                  createDownloadDirectoryName(subItem.showName || subItem.title),
                  ...[createDownloadSeasonDirectoryName(subItem.seasonTitle)].filter(
                    (name): name is string => Boolean(name),
                  ),
                ],
              }).catch(() => undefined);
            }
            removeDownload(subItem.id);
          }

          if (item.filePath) {
            await deleteDownloadOutput(item.filePath, {
              downloadLocation: item.downloadLocation,
              outputDirectoryNames: [
                createDownloadDirectoryName(item.showName || item.title),
                ...[createDownloadSeasonDirectoryName(item.seasonTitle)].filter(
                  (name): name is string => Boolean(name),
                ),
              ],
            }).catch(() => undefined);
          }
          removeDownload(item.id);
        }
      }
      setSelectedGroupIds(new Set());
    } catch (err) {
      console.error('Error deleting selected download groups:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePress = () => {
    const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id));
    if (selectedGroups.length === 0) return;

    triggerHaptic(HapticFeedbackTypes.effectHeavyClick);
    const totalFiles = selectedGroups.reduce((acc, g) => acc + g.items.length, 0);
    const titleText =
      selectedGroups.length === 1
        ? `"${selectedGroups[0].title}"`
        : `${selectedGroups.length} titles`;

    showAppDialog({
      title: `Delete ${selectedGroups.length === 1 ? 'Title' : `${selectedGroups.length} Titles`}?`,
      message: `Are you sure you want to permanently delete all downloaded files (${totalFiles} ${totalFiles === 1 ? 'file' : 'files'}) for ${titleText} from your device storage?`,
      variant: 'warning',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Delete',
          variant: 'destructive',
          onPress: () => {
            deleteSelectedGroups(selectedGroups).catch(console.error);
          },
        },
      ],
    });
  };

  const isAllSelected =
    groups.length > 0 && selectedGroupIds.size === groups.length;

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
              {selectedGroupIds.size}
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
      ) : null}

      <FlatList
        data={groups}
        key={columns}
        numColumns={columns}
        keyExtractor={item => item.id}
        columnWrapperStyle={{gap: GRID_GAP}}
        contentContainerStyle={{
          paddingHorizontal: GRID_PADDING,
          paddingTop: isSelectionMode
            ? 14
            : Platform.OS === 'android'
            ? 28
            : 12,
          paddingBottom: isSelectionMode ? 120 : 80,
        }}
        ListHeaderComponent={
          !isSelectionMode ? (
            <View>
              <AppText
                role="headlineLargeEmphasized"
                className="mb-6 mt-2 text-center text-m3-on-background">
                Downloads
              </AppText>
              <CurrentDownloadsSection primary={colors.primary} />
              <MissingDownloadsSection primary={colors.primary} />
              {groups.length > 0 ? (
                <AppText
                  role="titleLargeEmphasized"
                  className="mb-4 text-m3-on-background">
                  Downloaded
                </AppText>
              ) : null}
            </View>
          ) : null
        }
        renderItem={({item}) => (
          <MediaPosterCard
            title={item.title}
            poster={item.poster}
            width={cardWidth}
            selected={selectedGroupIds.has(item.id)}
            selectionMode={isSelectionMode}
            subtitle={`${item.items.length} ${
              item.items.length === 1 ? 'Download' : 'Downloads'
            }`}
            onPress={() => handleCardPress(item.id)}
            onLongPress={() => handleCardLongPress(item.id)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <MaterialCommunityIcons
              name="download-off-outline"
              size={72}
              color={colors.onSurfaceVariant}
            />
            <AppText
              role="bodyLarge"
              className="mt-4 text-center text-m3-on-surface-variant">
              Your downloaded library is empty
            </AppText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

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
                {selectedGroupIds.size} selected
              </AppText>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              disabled={isDeleting || selectedGroupIds.size === 0}
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
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.onErrorContainer} />
              ) : (
                <>
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
                    Delete
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default Downloads;
