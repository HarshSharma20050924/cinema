import React from 'react';
import {StyleSheet} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {Control} from './Control';

interface FullscreenProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  resetControlTimeout: () => void;
  showControls: boolean;
}

export const Fullscreen = ({
  isFullscreen,
  toggleFullscreen,
  resetControlTimeout,
  showControls,
}: FullscreenProps) => {
  return (
    <Control
      callback={toggleFullscreen}
      resetControlTimeout={resetControlTimeout}
      style={styles.fullscreen}
      disabled={!showControls}>
      <MaterialIcons
        name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
        size={28}
        color="#fff"
      />
    </Control>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    flexDirection: 'row',
  },
});
