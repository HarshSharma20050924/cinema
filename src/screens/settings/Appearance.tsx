import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import type {SettingsStackParamList} from '../../App';
import AppearancePreference from './components/AppearancePreference';
import AppText from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Appearance'>;

const Appearance = ({navigation}: Props) => {
  const colors = useM3Colors();

  return (
    <ScrollView
      style={{backgroundColor: colors.background}}
      contentContainerStyle={{padding: 20, paddingBottom: 40}}
      showsVerticalScrollIndicator={false}>
      <View
        style={{alignItems: 'center', flexDirection: 'row', marginBottom: 24}}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={navigation.goBack}
          style={({pressed}) => ({
            alignItems: 'center',
            height: 44,
            justifyContent: 'center',
            marginRight: 10,
            opacity: pressed ? 0.6 : 1,
            width: 44,
          })}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={28}
            color={colors.onBackground}
          />
        </Pressable>
        <AppText
          role="headlineLargeEmphasized"
          style={{color: colors.onBackground}}>
          Appearance
        </AppText>
      </View>
      <AppearancePreference />
    </ScrollView>
  );
};

export default Appearance;
