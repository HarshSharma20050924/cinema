import React from 'react';
import {View, GestureResponderHandlers} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {styles} from './styles';

interface VolumeProps {
  volumeFillWidth: number;
  volumeTrackWidth: number;
  volumePosition: number;
  volumePanHandlers: GestureResponderHandlers;
}

export const Volume = ({
  volumeFillWidth,
  volumePosition,
  volumeTrackWidth,
  volumePanHandlers,
}: VolumeProps) => {
  return (
    <View style={styles.container}>
      <View style={[styles.fill, {width: volumeFillWidth}]} />
      <View style={[styles.track, {width: volumeTrackWidth}]} />
      <View
        style={[styles.handle, {left: volumePosition - 15}]}
        {...volumePanHandlers}>
        <MaterialIcons name="volume-up" size={20} color="#fff" />
      </View>
    </View>
  );
};
