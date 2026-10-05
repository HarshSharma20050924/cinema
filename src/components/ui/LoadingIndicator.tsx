import {
  ContainedLoadingIndicator,
  Host,
  LoadingIndicator as NativeLoadingIndicator,
} from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useM3Colors, useM3HostTheme } from '../../theme/M3PaletteContext';

interface LoadingIndicatorProps {
  contained?: boolean;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const LoadingIndicator = ({
  contained = false,
  size: indicatorSize = 45,
  color,
  style,
}: LoadingIndicatorProps) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const indicatorColor = color || colors.primary;
  const Indicator = contained
    ? ContainedLoadingIndicator
    : NativeLoadingIndicator;

  return (
    <View
      collapsable={false}
      style={[
        {
          alignItems: 'center',
          alignSelf: 'center',
          height: indicatorSize,
          justifyContent: 'center',
          width: indicatorSize,
        },
        style,
      ]}>
      <Host
        matchContents
        {...hostTheme}
        style={{ height: indicatorSize, width: indicatorSize }}>
        <Indicator
          color={indicatorColor}
          containerColor={contained ? colors.primaryContainer : undefined}
          modifiers={[size(indicatorSize, indicatorSize)]}
        />
      </Host>
    </View>
  );
};

export default LoadingIndicator;
