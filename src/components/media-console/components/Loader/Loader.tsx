import React from 'react';
import { View } from 'react-native';
import LoadingIndicator from '../../../ui/LoadingIndicator';
import { styles } from './styles';

interface LoaderProps {
  color?: string;
}

export const Loader = ({ color }: LoaderProps) => {
  return (
    <View style={styles.container}>
      <LoadingIndicator color={color} size={58} />
    </View>
  );
};
