import React from 'react';
import {Text, View} from 'react-native';
import {styles} from './styles';

interface TitleProps {
  primary: string;
  secondary?: string;
}

export const Title = (title: TitleProps) => {
  if (title) {
    return (
      <View style={[styles.control, _styles.title]}>
        <Text style={[styles.text, _styles.titleText]} numberOfLines={1}>
          {title.primary}
        </Text>
        {title.secondary && (
          <Text
            style={[_styles.secondaryText, {color: 'hsl(0, 0%, 70%)'}]}
            numberOfLines={1}>
            {title.secondary}
          </Text>
        )}
      </View>
    );
  }

  return null;
};

import {StyleSheet} from 'react-native';

const _styles = StyleSheet.create({
  title: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'column',
    padding: 0,
    marginRight: 16,
    marginTop: 15,
    height: 37,
  },
  titleText: {
    textAlign: 'center',
  },
  secondaryText: {
    fontSize: 12,
  },
});
