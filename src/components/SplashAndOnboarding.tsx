import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { mainStorage } from '../lib/storage';
import { extensionStorage, ProviderExtension } from '../lib/storage/extensionStorage';
import useContentStore from '../lib/zustand/contentStore';
import { PREBUNDLED_PROVIDERS, PREBUNDLED_MODULES } from '../lib/providers/prebundled';

interface Props {
  onFinish: () => void;
}

export const SplashAndOnboarding: React.FC<Props> = ({ onFinish }) => {
  const [stage, setStage] = useState<'splash' | 'verify' | 'setup'>('splash');
  const [providerInput, setProviderInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>(() =>
    PREBUNDLED_PROVIDERS.map(p => p.value),
  );
  const [isFinishing, setIsFinishing] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const isAlreadyConfigured = mainStorage.getBool('is_configured', false);

  useEffect(() => {
    // Auto-proceed after 2.5 seconds if configured, otherwise show verify
    const timer = setTimeout(() => {
      handleSplashProceed();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleSplashProceed = () => {
    if (isAlreadyConfigured) {
      onFinish();
    } else {
      setStage('verify');
    }
  };

  const handleVerify = () => {
    const cleanInput = providerInput.trim().toLowerCase();
    if (cleanInput === 'harsh cinema') {
      setErrorMsg('');
      // Move to Step 2: Extension selection checklist (like web)
      setStage('setup');
    } else {
      setErrorMsg('Invalid provider name. Please enter "harsh cinema".');
    }
  };

  const toggleProvider = (val: string) => {
    setSelectedValues(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val],
    );
  };

  const isAllSelected = selectedValues.length === PREBUNDLED_PROVIDERS.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedValues([]);
    } else {
      setSelectedValues(PREBUNDLED_PROVIDERS.map(p => p.value));
    }
  };

  const handleFinishSetup = async () => {
    setIsFinishing(true);
    try {
      mainStorage.setBool('is_configured', true);

      // Pre-seed provider source
      extensionStorage.addProviderSources(
        'harsh-cinema',
        'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main',
      );
      extensionStorage.setDefaultProviderSource('harsh-cinema');

      // Filter prebundled providers by user's selection
      const providersToInstall = PREBUNDLED_PROVIDERS.filter(p =>
        selectedValues.includes(p.value),
      );

      const finalProviders =
        providersToInstall.length > 0 ? providersToInstall : [PREBUNDLED_PROVIDERS[0]];

      extensionStorage.setInstalledProviders(finalProviders);
      for (const m of PREBUNDLED_MODULES) {
        if (selectedValues.includes(m.value)) {
          extensionStorage.cacheProviderModules(m);
        }
      }

      useContentStore.getState().setInstalledProviders(finalProviders);
      useContentStore.getState().setProvider(finalProviders[0]);

      onFinish();
    } catch (e) {
      console.warn('Finish setup error:', e);
      onFinish();
    } finally {
      setIsFinishing(false);
    }
  };

  // 1. Splash Screen
  if (stage === 'splash') {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleSplashProceed}
        style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar hidden />
        <Image
          source={require('../../assets/splash_bg.png')}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          resizeMode="cover"
          fadeDuration={0}
          onLoad={() => setIsImageLoaded(true)}
          onLoadEnd={() => setIsImageLoaded(true)}
        />

        {/* Top Dark Tint */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 280,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: isImageLoaded ? 1 : 0,
          }}
        />

        {/* Static Typography on Upper Side - Clean, synchronized with photo */}
        <View
          style={{
            paddingHorizontal: 32,
            paddingTop: Platform.OS === 'android' ? 60 : 80,
            opacity: isImageLoaded ? 1 : 0,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              marginBottom: 16,
              borderWidth: 0.8,
              borderColor: 'rgba(255,255,255,0.18)',
            }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#E50914',
                marginRight: 6,
              }}
            />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.5,
              }}>
              CINEMA
            </Text>
          </View>

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 36,
              fontWeight: '900',
              letterSpacing: -1.2,
              lineHeight: 42,
              textShadowColor: 'rgba(0, 0, 0, 0.9)',
              textShadowOffset: { width: 0, height: 4 },
              textShadowRadius: 16,
            }}>
            {'movies are\ncheaper than\ntherapy.'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // 2. Onboarding Step 1: Verify "harsh cinema"
  if (stage === 'verify') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: '#09090C',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}>
        <StatusBar barStyle="light-content" backgroundColor="#09090C" />

        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: '#121318',
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: '#22222A',
            alignItems: 'center',
          }}>
          {/* App Icon */}
          <Image
            source={require('../../assets/icon.png')}
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          />

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: '800',
              letterSpacing: -0.5,
              marginBottom: 6,
              textAlign: 'center',
            }}>
            Enter Provider Source
          </Text>

          <Text
            style={{
              color: '#8E8E9A',
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 18,
              marginBottom: 20,
            }}>
            Enter the provider source name to unlock and activate extensions.
          </Text>

          <TextInput
            value={providerInput}
            onChangeText={t => {
              setProviderInput(t);
              setErrorMsg('');
            }}
            placeholder="Type 'harsh cinema'..."
            placeholderTextColor="#5A5A66"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleVerify}
            returnKeyType="done"
            style={{
              width: '100%',
              backgroundColor: '#1A1B22',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: '#FFFFFF',
              fontSize: 15,
              borderWidth: 1,
              borderColor: errorMsg ? '#E50914' : '#2C2D38',
              marginBottom: errorMsg ? 8 : 16,
            }}
          />

          {errorMsg ? (
            <Text
              style={{
                color: '#FF4D4D',
                fontSize: 12,
                marginBottom: 14,
                alignSelf: 'flex-start',
              }}>
              {errorMsg}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleVerify}
            activeOpacity={0.8}
            style={{
              width: '100%',
              backgroundColor: '#E50914',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
              Verify & Continue
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // 3. Onboarding Step 2: Select Streaming Providers (Like Web)
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#09090C',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
      }}>
      <StatusBar barStyle="light-content" backgroundColor="#09090C" />

      <View
        style={{
          width: '100%',
          maxWidth: 380,
          maxHeight: '85%',
          backgroundColor: '#121318',
          borderRadius: 24,
          padding: 22,
          borderWidth: 1,
          borderColor: '#22222A',
        }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              backgroundColor: 'rgba(229, 9, 20, 0.12)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 10,
            }}>
            <MaterialCommunityIcons name="layers-outline" size={26} color="#E50914" />
          </View>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '800',
              letterSpacing: -0.5,
              marginBottom: 4,
              textAlign: 'center',
            }}>
            Select Streaming Providers
          </Text>
          <Text
            style={{
              color: '#8E8E9A',
              fontSize: 13,
              textAlign: 'center',
            }}>
            Choose extensions to install now or select all.
          </Text>
        </View>

        {/* Top Toggle: Select All / Deselect All */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 4,
            borderBottomWidth: 1,
            borderBottomColor: '#1E1F29',
            marginBottom: 8,
          }}>
          <Text style={{ color: '#8E8E9A', fontSize: 13, fontWeight: '500' }}>
            Selected: {selectedValues.length}/{PREBUNDLED_PROVIDERS.length}
          </Text>
          <TouchableOpacity
            onPress={toggleSelectAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text
              style={{
                color: '#E50914',
                fontSize: 13,
                fontWeight: '700',
              }}>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Providers Checklist */}
        <ScrollView
          style={{ maxHeight: 250, marginVertical: 6 }}
          showsVerticalScrollIndicator={false}>
          {PREBUNDLED_PROVIDERS.map((item: ProviderExtension) => {
            const isSelected = selectedValues.includes(item.value);
            return (
              <TouchableOpacity
                key={item.value}
                activeOpacity={0.7}
                onPress={() => toggleProvider(item.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  marginBottom: 6,
                  backgroundColor: isSelected ? 'rgba(229, 9, 20, 0.08)' : '#181920',
                  borderWidth: 1,
                  borderColor: isSelected ? 'rgba(229, 9, 20, 0.35)' : '#23242E',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {item.icon ? (
                    <Image
                      source={{ uri: item.icon }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        marginRight: 12,
                        backgroundColor: '#2A2A35',
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: '#2A2A35',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                      <MaterialCommunityIcons name="movie-play" size={18} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontWeight: '600',
                      }}>
                      {item.display_name}
                    </Text>
                    <Text style={{ color: '#6E6E7C', fontSize: 11 }}>
                      v{item.version} • {item.type}
                    </Text>
                  </View>
                </View>

                {/* Checkbox */}
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#E50914' : '#4E4E5C',
                    backgroundColor: isSelected ? '#E50914' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action Button */}
        <TouchableOpacity
          disabled={isFinishing}
          onPress={handleFinishSetup}
          activeOpacity={0.8}
          style={{
            width: '100%',
            backgroundColor: '#E50914',
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 12,
            flexDirection: 'row',
            justifyContent: 'center',
          }}>
          {isFinishing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                Finish & Start Watching
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
