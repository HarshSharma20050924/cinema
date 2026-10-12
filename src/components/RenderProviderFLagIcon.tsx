import {View} from 'react-native';
import {SvgUri} from 'react-native-svg';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {FLAGS} from '../lib/constants';
import React from 'react';

const RenderProviderFlagIcon = ({type}: {type?: string}) => {
  const safeType = (type || 'GLOBAL').toLocaleUpperCase();
  const uri = FLAGS[safeType as keyof typeof FLAGS] || '';
  return (
    <View style={{width: 28, height: 28, alignItems: 'center', justifyContent: 'center'}}>
      {uri ? (
        <SvgUri width={28} height={28} uri={uri} />
      ) : (
        <MaterialIcons name="public" size={24} color="#E50914" />
      )}
    </View>
  );
};

export default RenderProviderFlagIcon;
