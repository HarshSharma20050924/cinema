import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import React, { useState } from 'react';
import useContentStore from '../lib/zustand/contentStore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { settingsStorage } from '../lib/storage';
import { extensionStorage } from '../lib/storage/extensionStorage';
import { extensionManager } from '../lib/services/ExtensionManager';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { RootStackParamList } from '../App';
import { useM3Colors } from '../theme/M3PaletteContext';
import * as DocumentPicker from 'expo-document-picker';
import { PREBUNDLED_PROVIDERS, PREBUNDLED_MODULES } from '../lib/providers/prebundled';

const Tutorial = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const colors = useM3Colors();
  const { provider: currentProvider, installedProviders } = useContentStore(
    state => state,
  );
  const [showTutorial, setShowTutorial] = useState<boolean>(!currentProvider);
  const [installingAll, setInstallingAll] = useState<boolean>(false);
  const [installProgress, setInstallProgress] = useState<string>('');

  // Handle default provider setup
  React.useEffect(() => {
    if (
      !currentProvider ||
      !currentProvider.value ||
      !installedProviders ||
      installedProviders.length === 0
    ) {
      setShowTutorial(true);
    } else {
      setShowTutorial(false);
    }
  }, [installedProviders, currentProvider]);

  // Handle status bar color
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBackgroundColor('#0B0B0E');
      StatusBar.setBarStyle('light-content');

      return () => {
        StatusBar.setBackgroundColor('#0B0B0E');
        StatusBar.setBarStyle('light-content');
      };
    }, []),
  );

  const handleQuickInstallAll = async () => {
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('impactHeavy');
    }

    try {
      setInstallingAll(true);
      setInstallProgress('Fetching extension catalog...');
      // Immediately seed prebundled providers
      extensionStorage.setInstalledProviders(PREBUNDLED_PROVIDERS);
      for (const m of PREBUNDLED_MODULES) {
        extensionStorage.cacheProviderModules(m);
      }
      useContentStore.getState().setInstalledProviders(PREBUNDLED_PROVIDERS);
      useContentStore.getState().setProvider(PREBUNDLED_PROVIDERS[0]);
      setShowTutorial(false);
      ToastAndroid.show('Cinema is ready! All extensions installed.', ToastAndroid.LONG);
    } catch (e: any) {
      console.warn('Quick install failed:', e);
      extensionStorage.setInstalledProviders(PREBUNDLED_PROVIDERS);
      useContentStore.getState().setInstalledProviders(PREBUNDLED_PROVIDERS);
      useContentStore.getState().setProvider(PREBUNDLED_PROVIDERS[0]);
      setShowTutorial(false);
    } finally {
      setInstallingAll(false);
    }
  };

  const handleGoToExtensions = () => {
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectClick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    navigation.navigate('TabStack', {
      screen: 'SettingsStack',
      params: {
        screen: 'Extensions',
      },
    });
  };

  const handlePlayLocalFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      multiple: false,
      copyToCacheDirectory: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const video = result.assets[0];
    navigation.navigate('Player', {
      linkIndex: 0,
      episodeList: [
        {
          id: video.uri,
          title: video.name || 'Local video',
          link: video.uri,
        },
      ],
      directUrl: video.uri,
      type: 'mp4',
      primaryTitle: video.name || 'Local video',
      poster: {},
    });
  };

  return showTutorial ? (
    <View
      style={{ backgroundColor: '#0B0B0E' }}
      className="absolute inset-0 z-50 justify-center items-center w-full h-full px-6">
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="rounded-3xl p-6 w-full max-w-sm items-center border border-white/10"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
        
        {/* Cinema Logo Icon */}
        <View
          className="w-20 h-20 rounded-2xl items-center justify-center mb-5"
          style={{ backgroundColor: 'rgba(229, 9, 20, 0.15)' }}>
          <MaterialCommunityIcons
            name="movie-open"
            size={44}
            color="#E50914"
          />
        </View>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 26,
            fontWeight: '800',
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 8,
          }}>
          Welcome to Cinema
        </Text>

        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 22,
          }}>
          Your server-independent streaming powerhouse. Install all extensions with one tap to get started immediately.
        </Text>

        {/* 1-Tap Select All & Install All */}
        <TouchableOpacity
          disabled={installingAll}
          onPress={handleQuickInstallAll}
          activeOpacity={0.8}
          className="px-6 py-3.5 rounded-2xl w-full flex-row items-center justify-center mb-3 shadow-lg"
          style={{ backgroundColor: '#E50914', opacity: installingAll ? 0.7 : 1 }}>
          {installingAll ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons
              name="download-multiple"
              size={20}
              color="#FFFFFF"
            />
          )}
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: '700',
              marginLeft: 8,
            }}>
            {installingAll ? 'Installing Extensions...' : 'Install All Extensions (1-Tap)'}
          </Text>
        </TouchableOpacity>

        {installingAll && (
          <Text
            style={{
              color: '#E50914',
              fontSize: 12,
              fontWeight: '600',
              marginBottom: 12,
              textAlign: 'center',
            }}>
            {installProgress}
          </Text>
        )}

        {/* Choose extensions manually */}
        <TouchableOpacity
          disabled={installingAll}
          onPress={handleGoToExtensions}
          activeOpacity={0.7}
          className="px-6 py-3 rounded-2xl w-full flex-row items-center justify-center mb-3"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
          }}>
          <MaterialCommunityIcons
            name="tune"
            size={18}
            color="rgba(255, 255, 255, 0.85)"
          />
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 14,
              fontWeight: '600',
              marginLeft: 8,
            }}>
            Select Extensions Manually
          </Text>
        </TouchableOpacity>

        {/* Play Local File */}
        <TouchableOpacity
          disabled={installingAll}
          onPress={handlePlayLocalFile}
          activeOpacity={0.7}
          className="px-6 py-2.5 rounded-2xl w-full flex-row items-center justify-center"
          style={{
            backgroundColor: 'transparent',
          }}>
          <MaterialCommunityIcons
            name="folder-play-outline"
            size={18}
            color="rgba(255, 255, 255, 0.5)"
          />
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 13,
              fontWeight: '500',
              marginLeft: 6,
            }}>
            Play Local Video File
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  ) : null;
};

export default Tutorial;
