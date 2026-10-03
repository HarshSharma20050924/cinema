import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import React from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {settingsStorage} from '../../lib/storage';
import {useM3Colors} from '../../theme/M3PaletteContext';
import AppText from '../ui/Text';
import {AnimatedTabIcon, type AnimatedTabIconName} from './AnimatedTabIcon';

const TAB_ICONS: Record<string, AnimatedTabIconName> = {
  HomeStack: 'home',
  SearchStack: 'search',
  WatchListStack: 'watchlist',
  DownloadsStack: 'download',
  SettingsStack: 'settings',
};

const StreamingTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const colors = useM3Colors();
  const insets = useSafeAreaInsets();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const isNavigationRail = Math.min(windowWidth, windowHeight) >= 600;
  const showLabels = settingsStorage.showTabBarLabels();
  const bottomBarPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  return (
    <View
      style={{
        backgroundColor: '#0D0D11',
        borderTopColor: 'rgba(255,255,255,0.08)',
        borderTopWidth: isNavigationRail ? 0 : StyleSheet.hairlineWidth,
        borderRightColor: isNavigationRail ? 'rgba(255,255,255,0.08)' : undefined,
        borderRightWidth: isNavigationRail ? StyleSheet.hairlineWidth : 0,
        height: isNavigationRail ? '100%' : undefined,
        paddingBottom: isNavigationRail
          ? Math.max(insets.bottom, 12)
          : bottomBarPadding,
        paddingLeft: isNavigationRail ? insets.left : 4,
        paddingRight: 4,
        paddingTop: isNavigationRail ? Math.max(insets.top, 16) : 6,
        width: isNavigationRail ? 96 + insets.left : undefined,
      }}>
      <View
        style={{
          alignItems: isNavigationRail ? 'center' : undefined,
          flex: isNavigationRail ? 1 : undefined,
          flexDirection: isNavigationRail ? 'column' : 'row',
          gap: isNavigationRail ? 8 : undefined,
          height: isNavigationRail ? undefined : showLabels ? 58 : 42,
        }}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof descriptor.options.tabBarLabel === 'string'
              ? descriptor.options.tabBarLabel
              : typeof descriptor.options.title === 'string'
                ? descriptor.options.title
                : route.name;
          const icon = TAB_ICONS[route.name] ?? 'home';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              if (settingsStorage.isHapticFeedbackEnabled()) {
                ReactNativeHapticFeedback.trigger('effectTick', {
                  enableVibrateFallback: true,
                  ignoreAndroidSystemSettings: false,
                });
              }
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? {selected: true} : {}}
              accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
              activeOpacity={0.8}
              onLongPress={() =>
                navigation.emit({type: 'tabLongPress', target: route.key})
              }
              onPress={onPress}
              style={{
                alignItems: 'center',
                flex: isNavigationRail ? undefined : 1,
                height: isNavigationRail
                  ? showLabels
                    ? 72
                    : 56
                  : showLabels
                    ? 58
                    : 42,
                justifyContent: 'center',
                minWidth: 48,
                width: isNavigationRail ? 88 : undefined,
              }}>
                <View
                  pointerEvents="none"
                  style={{
                    alignItems: 'center',
                    backgroundColor: focused
                      ? colors.primary || '#E50914'
                      : 'transparent',
                    borderRadius: 16,
                    height: 32,
                    justifyContent: 'center',
                    overflow: 'hidden',
                    width: 56,
                  }}>
                  <AnimatedTabIcon
                    name={icon}
                    active={focused}
                    color={
                      focused
                        ? '#FFFFFF'
                        : '#8E8E98'
                    }
                    size={24}
                  />
                </View>
                {showLabels ? (
                  <AppText
                    role={focused ? 'labelMediumEmphasized' : 'labelMedium'}
                    numberOfLines={1}
                    style={{
                      color: focused ? (colors.primary || '#E50914') : '#8E8E98',
                      marginTop: 4,
                      textAlign: 'center',
                      fontWeight: focused ? '700' : '500',
                    }}>
                    {label}
                  </AppText>
                ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default StreamingTabBar;
