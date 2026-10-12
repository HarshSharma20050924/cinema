import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useM3Colors } from '../../theme/M3PaletteContext';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: (value: string) => void;
  onFocusChange?: (focused: boolean) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export interface SearchFieldRef {
  focus: () => void;
}

const SearchField = forwardRef<SearchFieldRef, SearchFieldProps>(
  (
    {
      value,
      onChangeText,
      onSubmit,
      onFocusChange,
      placeholder = 'Search',
      style,
    },
    ref,
  ) => {
    const colors = useM3Colors();
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surfaceContainerHigh || '#222222',
            borderColor: '#333333',
          },
          style,
        ]}>
        <MaterialCommunityIcons
          name="magnify"
          size={22}
          color={colors.primary || '#E50914'}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant || '#8E8E93'}
          returnKeyType="search"
          onSubmitEditing={() => onSubmit(value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor={colors.primary || '#E50914'}
          style={[styles.input, { color: colors.onSurface || '#FFFFFF' }]}
        />
        {value.length > 0 && (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => onChangeText('')}
            style={styles.clearButton}>
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={colors.onSurfaceVariant || '#888888'}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    width: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 6,
    padding: 2,
  },
});

export default SearchField;
