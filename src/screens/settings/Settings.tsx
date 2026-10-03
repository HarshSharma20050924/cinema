import {
  DevSettings,
  ToastAndroid,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import React, {useCallback, useMemo} from 'react';
import {
  settingsStorage,
  clearAllMMKVStorage,
  ProviderExtension,
} from '../../lib/storage';
import * as Updates from 'expo-updates';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import useContentStore from '../../lib/zustand/contentStore';
import {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {SettingsStackParamList, TabStackParamList} from '../../App';
import {MaterialIcons} from '@expo/vector-icons';
import Animated, {FadeInDown, FadeInUp, Layout} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import RenderProviderFlagIcon from '../../components/RenderProviderFLagIcon';
import useNavigationPreferencesStore from '../../lib/zustand/navigationPreferencesStore';

import DnsPreference from './components/DnsPreference';
import IconButton from '../../components/ui/IconButton';
import SettingsRow from '../../components/ui/SettingsRow';
import SettingsSection from '../../components/ui/SettingsSection';
import AppText from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';
import {showAppDialog} from '../../lib/zustand/appDialogStore';
import {clearAppCache} from '../../lib/clearAppCache';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

const AnimatedSection = ({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) => (
  <View>
    {children}
  </View>
);

const Settings = ({navigation}: Props) => {
  const tabNavigation =
    useNavigation<NativeStackNavigationProp<TabStackParamList>>();
  const colors = useM3Colors();
  const provider = useContentStore(state => state.provider);
  const setProvider = useContentStore(state => state.setProvider);
  const installedProviders = useContentStore(state => state.installedProviders);
  const hideDownloadsTab = useNavigationPreferencesStore(
    state => state.hideDownloadsTab,
  );

  const handleProviderSelect = useCallback(
    (item: ProviderExtension) => {
      setProvider(item);
      // Add haptic feedback
      if (settingsStorage.isHapticFeedbackEnabled()) {
        ReactNativeHapticFeedback.trigger('virtualKey', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      // Navigate to home screen
      tabNavigation.navigate('HomeStack');
    },
    [setProvider, tabNavigation],
  );

  const renderProviderItem = useCallback(
    (item: ProviderExtension, isSelected: boolean) => (
      <View
        key={item.value}
        style={{
          backgroundColor: isSelected ? colors.secondaryContainer : '#2A2A2A',
          borderColor: isSelected ? colors.primary : '#5A5A5A',
          borderRadius: 20,
          borderWidth: isSelected ? 2 : 1,
          height: 84,
          marginRight: 12,
          overflow: 'hidden',
          width: 132,
        }}>
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => handleProviderSelect(item)}
          style={{flex: 1}}>
          <View className="flex-col items-center justify-center h-full p-3">
            <RenderProviderFlagIcon type={item.type} />
            <AppText
              numberOfLines={1}
              role="labelMediumEmphasized"
              style={{
                color: isSelected
                  ? colors.onSecondaryContainer
                  : colors.onSurface,
                marginTop: 9,
                textAlign: 'center',
              }}>
              {item.display_name}
            </AppText>
            {isSelected && (
              <View style={{position: 'absolute', right: 8, top: 8}}>
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={colors.onSecondaryContainer}
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    ),
    [colors, handleProviderSelect],
  );

  const providersList = useMemo(
    () =>
      installedProviders.map(item =>
        renderProviderItem(item, provider.value === item.value),
      ),
    [installedProviders, provider.value, renderProviderItem],
  );

  const clearCacheHandler = useCallback(async () => {
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('virtualKey', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    await clearAppCache();
    ToastAndroid.show('App cache cleared', ToastAndroid.SHORT);
  }, []);

  const eraseAllLocalData = useCallback(async () => {
    clearAllMMKVStorage();
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
      return;
    }
    DevSettings.reload('All MMKV storage erased');
  }, []);

  const confirmEraseAllLocalData = useCallback(() => {
    showAppDialog({
      title: 'Erase all local data?',
      message:
        'This permanently erases every Cinema MMKV store, including settings, installed provider data, Watchlist, Continue watching, download records, and cached state. This cannot be undone. Downloaded media files on disk are not deleted.',
      variant: 'error',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Erase everything',
          variant: 'destructive',
          onPress: eraseAllLocalData,
        },
      ],
    });
  }, [eraseAllLocalData]);

  return (
    <Animated.ScrollView
      className="h-full w-full bg-m3-background"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      bounces={true}
      overScrollMode="always"
      contentContainerStyle={{
        paddingTop: 15,
        paddingBottom: 24,
        flexGrow: 1,
      }}>
      <View className="p-5">
        <View>
          <AppText
            role="headlineLargeEmphasized"
            className="mb-6 text-m3-on-background">
            Settings
          </AppText>
        </View>

        {/* Content provider section */}
        <AnimatedSection delay={100}>
          <View className="mb-6">
            <AppText
              role="labelLarge"
              className="mb-3"
              style={{color: colors.onSurfaceVariant}}>
              Content Provider
            </AppText>
            <View
              style={{
                backgroundColor: colors.background,
                borderColor: colors.outlineVariant,
                borderRadius: 24,
                borderWidth: 1,
                height: 116,
                justifyContent: 'center',
              }}>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                style={{flexGrow: 0}}
                contentContainerStyle={{
                  alignItems: 'center',
                  paddingHorizontal: 10,
                }}>
                {providersList}
                {installedProviders.length === 0 && (
                  <AppText
                    role="bodyMedium"
                    style={{color: colors.onSurfaceVariant}}>
                    No providers installed
                  </AppText>
                )}
              </ScrollView>
            </View>
          </View>
          <SettingsSection title="Provider tools">
            <SettingsRow
              title="Provider Manager"
              description="Install, update, and test provider extensions"
              icon="puzzle-outline"
              divider={false}
              onPress={() => navigation.navigate('Extensions')}
            />
          </SettingsSection>
        </AnimatedSection>

        {/* Network Section */}
        <AnimatedSection delay={150}>
          <SettingsSection title="Network">
            <DnsPreference />
          </SettingsSection>
        </AnimatedSection>

        {/* Main options section */}
        <AnimatedSection delay={200}>
          <SettingsSection title="Options">
            <SettingsRow
              title="Appearance"
              // description="Accent colors and launcher icon"
              icon="palette-outline"
              onPress={() => navigation.navigate('Appearance')}
            />
            <SettingsRow
              title="Subtitle Style"
              icon="subtitles-outline"
              onPress={() => navigation.navigate('SubTitlesPreferences')}
            />
            {hideDownloadsTab && (
              <SettingsRow
                title="Downloads"
                icon="download-circle-outline"
                onPress={() => navigation.navigate('DownloadsStack')}
              />
            )}
            <SettingsRow
              title="Preferences"
              icon="tune-variant"
              divider={false}
              onPress={() => navigation.navigate('Preferences')}
            />
          </SettingsSection>
        </AnimatedSection>

        {/* Data Management section */}
        <AnimatedSection delay={300}>
          <SettingsSection title="Data Management">
            <SettingsRow
              title="Clear Cache"
              trailing={
                <IconButton
                  icon="delete-outline"
                  label="Clear cache"
                  onPress={clearCacheHandler}
                />
              }
            />
            <SettingsRow
              title="Erase all local data"
              description="Erase all local data"
              icon="delete-alert-outline"
              divider={false}
              onPress={confirmEraseAllLocalData}
            />
          </SettingsSection>
        </AnimatedSection>

        {/* About & GitHub section */}
        <AnimatedSection delay={400}>
          <SettingsSection title="About">
            <SettingsRow
              title="About Cinema"
              icon="information-outline"
              onPress={() => navigation.navigate('About')}
            />
          </SettingsSection>
        </AnimatedSection>
      </View>
    </Animated.ScrollView>
  );
};

export default Settings;
