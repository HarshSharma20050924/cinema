import React, {ReactNode} from 'react';
import {
  Platform,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {TVOSSupport} from './TVOSSupport';
import {_styles} from '../styles';

interface OSSupport {
  children: ReactNode;
  containerStyles: StyleProp<ViewStyle>;
  onScreenTouch: () => void;
  showControls: boolean;
  testID?: string;
}

export const PlatformSupport = ({
  children,
  onScreenTouch,
  containerStyles,
  showControls,
  testID,
}: OSSupport) => {
  if (Platform.isTV) {
    return (
      <>
        <TVOSSupport
          showControls={showControls}
          onScreenTouch={onScreenTouch}
        />
        {children}
      </>
    );
  }

  // Mobile input is owned by the RNGH gesture surface inside VideoPlayer.
  // Wrapping it in a TouchableWithoutFeedback creates a second recognizer for
  // every tap (and shares the same delayed-tap ref), causing controls to toggle
  // twice and preventing a two-pointer pinch from being recognized reliably.
  return (
    <View
      testID={testID}
      style={[_styles.player.container, containerStyles]}>
      {children}
    </View>
  );
};
