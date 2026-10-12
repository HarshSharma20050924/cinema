import {MaterialCommunityIcons} from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import type {ProviderExtension} from '../../../lib/storage/extensionStorage';
import {useM3Colors} from '../../../theme/M3PaletteContext';

export type ProviderTestStatus = 'untested' | 'testing' | 'working' | 'failed';

interface ProviderCardProps {
  provider: ProviderExtension;
  itemKey: string;
  installed: boolean;
  active: boolean;
  installing: boolean;
  updating: boolean;
  testStatus: ProviderTestStatus;
  hasUpdate: boolean;
  hasSettings?: boolean;
  primary: string;
  onActivate: () => void;
  onInstall: () => void;
  onUpdate: () => void;
  onTest: () => void;
  onUninstall: () => void;
  onOpenSettings?: () => void;
}

const ProviderStatusBadge = ({
  status,
  itemKey,
}: {
  status: ProviderTestStatus;
  itemKey: string;
}) => {
  const colors = useM3Colors();

  if (status === 'testing') {
    return (
      <View
        testID={`provider-status-${itemKey}-testing`}
        className="h-8 flex-row items-center px-3"
        style={{
          backgroundColor: colors.secondaryContainer,
          borderRadius: 16,
        }}>
        <ActivityIndicator size={14} color={colors.onSecondaryContainer} />
        <Text
          className="ml-2 text-xs font-bold"
          style={{color: colors.onSecondaryContainer}}>
          Testing
        </Text>
      </View>
    );
  }

  const failed = status === 'failed';
  const working = status === 'working';
  const label = failed ? 'Failed' : working ? 'Working' : 'Not tested';
  const icon = failed ? 'close-circle' : working ? 'check-circle' : 'circle';
  const containerColor = failed
    ? colors.errorContainer
    : working
      ? colors.tertiaryContainer
      : colors.surfaceContainerHighest;
  const contentColor = failed
    ? colors.onErrorContainer
    : working
      ? colors.onTertiaryContainer
      : colors.onSurfaceVariant;

  return (
    <View
      testID={`provider-status-${itemKey}-${status}`}
      className="h-8 flex-row items-center px-3"
      style={{
        backgroundColor: containerColor,
        borderRadius: 16,
      }}>
      <MaterialCommunityIcons
        name={icon}
        size={status === 'untested' ? 9 : 16}
        color={contentColor}
      />
      <Text className="ml-2 text-xs font-bold" style={{color: contentColor}}>
        {label}
      </Text>
    </View>
  );
};

const MetadataChip = ({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
}) => {
  const colors = useM3Colors();
  return (
    <View
      className="mr-2 mt-2 max-w-36 flex-row items-center px-2.5 py-1.5"
      style={{
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: 10,
      }}>
      <MaterialCommunityIcons
        name={icon}
        size={15}
        color={colors.onSurfaceVariant}
      />
      <Text
        className="ml-1.5 text-xs capitalize"
        style={{color: colors.onSurfaceVariant}}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const ProviderCard = ({
  provider,
  itemKey,
  installed,
  active,
  installing,
  updating,
  testStatus,
  hasUpdate,
  hasSettings,
  primary,
  onActivate,
  onInstall,
  onUpdate,
  onTest,
  onUninstall,
  onOpenSettings,
}: ProviderCardProps) => {
  const colors = useM3Colors();

  return (
    <View
      className="mx-4 mb-3 overflow-hidden"
      style={{
        backgroundColor: colors.surfaceContainerHigh,
        borderColor: active ? colors.primary : colors.outlineVariant,
        borderRadius: 24,
        borderWidth: active ? 2 : 1,
      }}>
      <Pressable
        disabled={!installed}
        onPress={onActivate}
        android_ripple={{color: colors.onSurfaceVariant, borderless: false}}
        className="flex-row items-start p-4"
        style={({pressed}) => ({opacity: pressed ? 0.78 : 1})}>
        <View
          className="h-14 w-14 items-center justify-center overflow-hidden"
          style={{
            backgroundColor: active
              ? colors.primary
              : colors.surfaceContainerHighest,
            borderRadius: 18,
          }}>
          {provider.icon ? (
            <Image
              source={{uri: provider.icon}}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name="web"
              size={32}
              color={active ? colors.onPrimary : colors.onSurface}
            />
          )}
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <View className="flex-row items-center">
            <Text
              className="shrink text-xl font-bold"
              style={{color: colors.onSurface}}
              numberOfLines={1}>
              {provider.display_name || 'Unknown Provider'}
            </Text>
            <Text
              className="ml-2 text-xs font-semibold"
              style={{color: colors.onSurfaceVariant}}>
              v{provider.version || 'Unknown'}
            </Text>
          </View>
          <View className="flex-row flex-wrap">
            <MetadataChip icon="web" label={provider.type || 'Unknown'} />
            {provider.source?.author && (
              <MetadataChip icon="account" label={provider.source.author} />
            )}
          </View>
        </View>

        {installed && (
          <View className="ml-2 items-end gap-2">
            {hasUpdate && (
              <Pressable
                testID={`update-provider-${itemKey}`}
                accessibilityLabel={`Update ${provider.display_name}`}
                disabled={updating}
                onPress={onUpdate}
                android_ripple={{color: colors.onPrimary, borderless: true, radius: 18}}
                className="h-9 w-9 items-center justify-center"
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 14,
                }}>
                {updating ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <MaterialCommunityIcons
                    name="update"
                    size={20}
                    color={colors.onPrimary}
                  />
                )}
              </Pressable>
            )}
            <ProviderStatusBadge status={testStatus} itemKey={itemKey} />
          </View>
        )}
      </Pressable>

      <View
        className="mx-4 h-px"
        style={{backgroundColor: colors.outlineVariant}}
      />

      {installed ? (
        <View className="flex-row gap-2 p-3">
          <View
            className="h-12 min-w-0 flex-1 overflow-hidden"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 16,
            }}>
            <Pressable
              testID={`test-provider-${itemKey}`}
              accessibilityLabel={`Test ${provider.display_name}`}
              disabled={testStatus === 'testing'}
              onPress={onTest}
              android_ripple={{color: colors.onSurfaceVariant, borderless: false}}
              className="h-full w-full flex-row items-center justify-center px-1"
              style={({pressed}) => ({
                backgroundColor: pressed ? colors.surfaceBright : 'transparent',
              })}>
              {testStatus === 'testing' ? (
                <ActivityIndicator size="small" color={primary} />
              ) : (
                <MaterialCommunityIcons name="flask" size={18} color={primary} />
              )}
              <Text
                numberOfLines={1}
                className="ml-1 text-xs font-bold"
                style={{color: colors.onSurface}}>
                {testStatus === 'testing' ? 'Testing' : 'Test'}
              </Text>
            </Pressable>
          </View>

          {hasSettings && onOpenSettings && (
            <View
              className="h-12 min-w-0 flex-1 overflow-hidden"
              style={{
                backgroundColor: colors.surfaceContainerHighest,
                borderRadius: 16,
              }}>
              <Pressable
                testID={`settings-provider-${itemKey}`}
                accessibilityLabel={`Settings for ${provider.display_name}`}
                onPress={onOpenSettings}
                android_ripple={{color: colors.onSurfaceVariant, borderless: false}}
                className="h-full w-full flex-row items-center justify-center px-1"
                style={({pressed}) => ({
                  backgroundColor: pressed ? colors.surfaceBright : 'transparent',
                })}>
                <MaterialCommunityIcons
                  name="cog-outline"
                  size={18}
                  color={primary}
                />
                <Text
                  numberOfLines={1}
                  className="ml-1 text-xs font-bold"
                  style={{color: colors.onSurface}}>
                  Settings
                </Text>
              </Pressable>
            </View>
          )}

          <View
            className="h-12 min-w-0 flex-1 overflow-hidden"
            style={{
              backgroundColor: colors.surfaceContainerHighest,
              borderRadius: 16,
            }}>
            <Pressable
              testID={`uninstall-provider-${itemKey}`}
              accessibilityLabel={`Uninstall ${provider.display_name}`}
              onPress={onUninstall}
              android_ripple={{color: colors.onSurfaceVariant, borderless: false}}
              className="h-full w-full flex-row items-center justify-center px-1"
              style={({pressed}) => ({
                backgroundColor: pressed ? colors.surfaceBright : 'transparent',
              })}>
              <MaterialCommunityIcons
                name="delete-outline"
                size={18}
                color={colors.onErrorContainer}
              />
              <Text
                numberOfLines={1}
                className="ml-1 text-xs font-bold"
                style={{color: colors.onErrorContainer}}>
                Uninstall
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          className="m-3 h-12 overflow-hidden"
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
          }}>
          <Pressable
            testID={`install-provider-${itemKey}`}
            disabled={installing}
            onPress={onInstall}
            android_ripple={{color: colors.onPrimary, borderless: false}}
            className="h-full w-full flex-row items-center justify-center"
            style={({pressed}) => ({
              opacity: pressed ? 0.75 : 1,
            })}>
            {installing ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <MaterialCommunityIcons
                name="download"
                size={20}
                color={colors.onPrimary}
              />
            )}
            <Text
              className="ml-2 text-sm font-bold"
              style={{color: colors.onPrimary}}>
              {installing ? 'Installing' : 'Install'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default React.memo(ProviderCard);
