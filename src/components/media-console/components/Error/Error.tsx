import React from 'react';
import {Text, View} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {styles} from './styles';

interface ErrorProps {
  error: boolean;
}

export const Error = ({error}: ErrorProps) => {
  if (error) {
    return (
      <View style={styles.container}>
        <MaterialIcons name="error-outline" size={48} color="tomato" />
        <Text style={styles.text}>Video unavailable</Text>
      </View>
    );
  }
  return null;
};
