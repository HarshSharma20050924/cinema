import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  TouchableWithoutFeedback,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useM3Colors } from '../../theme/M3PaletteContext';
import { LEGACY_TERTIARY_BACKGROUND } from '../../theme/seeds';

interface DropdownFieldProps<T> {
  options: readonly T[];
  value?: T;
  getKey: (option: T) => string;
  getLabel: (option: T) => string;
  onChange: (option: T) => void;
  placeholder?: string;
  showFullOptionLabels?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function DropdownField<T>({
  options,
  value,
  getKey,
  getLabel,
  onChange,
  placeholder = 'Select',
  showFullOptionLabels = false,
  style,
  disabled = false,
}: DropdownFieldProps<T>) {
  const colors = useM3Colors();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedKey = value ? getKey(value) : undefined;
  const selectedOption = options.find(option => getKey(option) === selectedKey);
  const selectedLabel = selectedOption ? getLabel(selectedOption) : placeholder;

  const handleSelect = (option: T) => {
    onChange(option);
    setModalVisible(false);
  };

  return (
    <View style={[{ width: '100%' }, style]}>
      {/* Trigger Button */}
      <TouchableOpacity
        activeOpacity={0.75}
        disabled={disabled}
        onPress={() => setModalVisible(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: LEGACY_TERTIARY_BACKGROUND,
            borderColor: modalVisible ? colors.primary : '#333333',
            opacity: disabled ? 0.45 : 1,
          },
        ]}>
        <Text
          numberOfLines={1}
          style={[styles.selectedText, { color: colors.onSurface }]}>
          {selectedLabel}
        </Text>
        <MaterialCommunityIcons
          name={modalVisible ? 'menu-up' : 'menu-down'}
          size={24}
          color={colors.primary || '#E50914'}
        />
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: '#1E1E1E',
                    borderColor: '#333333',
                  },
                ]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                    {placeholder}
                  </Text>
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => setModalVisible(false)}>
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color="#888888"
                    />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={options as T[]}
                  keyExtractor={item => getKey(item)}
                  style={{ maxHeight: 320 }}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => {
                    const key = getKey(item);
                    const isSelected = key === selectedKey;
                    return (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleSelect(item)}
                        style={[
                          styles.optionItem,
                          isSelected && {
                            backgroundColor: 'rgba(229, 9, 20, 0.12)',
                          },
                        ]}>
                        <Text
                          numberOfLines={showFullOptionLabels ? undefined : 2}
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected
                                ? (colors.primary || '#E50914')
                                : colors.onSurface,
                              fontWeight: isSelected ? '700' : '400',
                            },
                          ]}>
                          {getLabel(item)}
                        </Text>
                        {isSelected && (
                          <MaterialCommunityIcons
                            name="check"
                            size={18}
                            color={colors.primary || '#E50914'}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2E2E2E',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  optionLabel: {
    fontSize: 14,
    flex: 1,
  },
});
