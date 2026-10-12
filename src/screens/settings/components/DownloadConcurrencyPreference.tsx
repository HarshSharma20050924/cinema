import { Host, Slider } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Surface from '../../../components/ui/Surface';
import AppText from '../../../components/ui/Text';
import { updateDownloadConcurrency } from '../../../lib/downloadManager';
import { settingsStorage } from '../../../lib/storage';
import { useM3Colors, useM3HostTheme } from '../../../theme/M3PaletteContext';

const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 5;

const DownloadConcurrencyPreference = ({
  primary: _primary,
}: {
  primary: string;
}) => {
  const colors = useM3Colors();
  const hostTheme = useM3HostTheme();
  const [concurrency, setConcurrency] = useState(
    settingsStorage.getDownloadConcurrency(),
  );
  const prevConcurrencyRef = useRef(concurrency);

  const update = useCallback((next: number) => {
    const rounded = Math.min(
      Math.max(Math.round(next), MIN_CONCURRENCY),
      MAX_CONCURRENCY,
    );
    if (rounded !== prevConcurrencyRef.current) {
      prevConcurrencyRef.current = rounded;
      if (settingsStorage.isHapticFeedbackEnabled()) {
        ReactNativeHapticFeedback.trigger('effectTick', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
    }
    setConcurrency(rounded);
    updateDownloadConcurrency(rounded);
  }, []);

  return (
    <View className="mb-6">
      <AppText role="labelLarge" className="mb-3 text-m3-on-surface-variant">
        Downloads
      </AppText>
      <Surface level="low" className="overflow-hidden">
        <View className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="mr-4 flex-1">
              <AppText role="bodyLarge" className="text-m3-on-surface">
                Concurrent Downloads
              </AppText>
              <AppText
                role="bodySmall"
                className="mt-1 text-m3-on-surface-variant">
                Extra downloads wait in the queue
              </AppText>
            </View>
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: colors.surfaceContainerHighest }}>
              <AppText
                testID="download-concurrency-value"
                role="titleSmall"
                style={{ color: colors.primary, fontWeight: '700' }}>
                {concurrency}
              </AppText>
            </View>
          </View>
          <View className="mt-2 w-full">
            <Host
              matchContents={{ vertical: true }}
              style={{ width: '100%' }}
              {...hostTheme}>
              <Slider
                value={concurrency}
                min={MIN_CONCURRENCY}
                max={MAX_CONCURRENCY}
                steps={MAX_CONCURRENCY - MIN_CONCURRENCY - 1}
                colors={{
                  thumbColor: colors.primary,
                  activeTrackColor: colors.primary,
                  inactiveTrackColor: colors.surfaceContainerHighest,
                  activeTickColor: colors.onPrimary,
                  inactiveTickColor: colors.outlineVariant,
                }}
                onValueChange={update}
                modifiers={[fillMaxWidth()]}
              />
            </Host>
          </View>
        </View>
      </Surface>
    </View>
  );
};

export default DownloadConcurrencyPreference;
