import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Host, Slider } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { settingsStorage } from '../../lib/storage';
import { useM3Colors, useM3HostTheme } from '../../theme/M3PaletteContext';
import AppText from './Text';

interface SettingsSliderRowProps {
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: number;
  min: number;
  max: number;
  step?: number;
  valueDisplay?: string | number;
  onValueChange: (value: number) => void;
  onValueChangeFinished?: (value: number) => void;
  divider?: boolean;
}

const SettingsSliderRow = ({
  title,
  description,
  icon,
  value,
  min,
  max,
  step,
  valueDisplay,
  onValueChange,
  onValueChangeFinished,
  divider = true,
}: SettingsSliderRowProps) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const prevValueRef = useRef(value);

  // In Android Jetpack Compose Slider:
  // steps = number of discrete intervals between min and max.
  // steps = (max - min) / step - 1
  let steps = 0;
  if (step && step > 0) {
    steps = Math.max(Math.round((max - min) / step) - 1, 0);
  }

  const triggerHaptic = useCallback(() => {
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectTick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
  }, []);

  const handleValueChange = useCallback(
    (v: number) => {
      let next = v;
      if (step && step > 0) {
        next = Math.round((v - min) / step) * step + min;
      }
      if (next !== prevValueRef.current) {
        prevValueRef.current = next;
        triggerHaptic();
      }
      onValueChange(next);
    },
    [min, step, onValueChange, triggerHaptic],
  );

  const handleValueChangeFinished = useCallback(() => {
    triggerHaptic();
    onValueChangeFinished?.(prevValueRef.current);
  }, [triggerHaptic, onValueChangeFinished]);

  const display = valueDisplay !== undefined ? valueDisplay : value;

  return (
    <View
      className="px-4 py-3"
      style={{
        borderBottomColor: colors.outlineVariant,
        borderBottomWidth: divider ? 1 : 0,
      }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {icon ? (
            <View
              className="mr-4 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.secondaryContainer }}>
              <MaterialCommunityIcons
                name={icon}
                size={21}
                color={colors.onSecondaryContainer}
                pointerEvents="none"
              />
            </View>
          ) : null}
          <View className="flex-1">
            <AppText role="bodyLarge" className="text-m3-on-surface">
              {title}
            </AppText>
            {description ? (
              <AppText
                role="bodySmall"
                className="mt-0.5 text-m3-on-surface-variant">
                {description}
              </AppText>
            ) : null}
          </View>
        </View>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: colors.surfaceContainerHighest }}>
          <AppText
            role="titleSmall"
            style={{ color: colors.primary, fontWeight: '700' }}>
            {display}
          </AppText>
        </View>
      </View>
      <View className="mt-2 w-full">
        <Host
          matchContents={{ vertical: true }}
          style={{ width: '100%' }}
          {...hostTheme}>
          <Slider
            value={value}
            min={min}
            max={max}
            steps={steps}
            colors={{
              thumbColor: colors.primary,
              activeTrackColor: colors.primary,
              inactiveTrackColor: colors.surfaceContainerHighest,
              activeTickColor: colors.onPrimary,
              inactiveTickColor: colors.outlineVariant,
            }}
            onValueChange={handleValueChange}
            onValueChangeFinished={handleValueChangeFinished}
            modifiers={[fillMaxWidth()]}
          />
        </Host>
      </View>
    </View>
  );
};

export default SettingsSliderRow;
