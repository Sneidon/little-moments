import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { NotificationBellButton } from '../NotificationBellButton';
import { spacing } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { DisplayTitle, HeaderBlock, Overline } from './HeaderBlock';

type Props = { overline?: string | null; title: string; style?: StyleProp<ViewStyle> };

export function TabHeader({ overline, title, style }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  return (
    <HeaderBlock style={[styles.header, style]}>
      <View style={styles.row}>
        <View style={styles.titles}>
          {overline ? <Overline>{overline}</Overline> : null}
          <DisplayTitle>{title}</DisplayTitle>
        </View>
        <NotificationBellButton variant="header" colors={colors} onPress={() => navigation.navigate('UserNotifications')} />
      </View>
    </HeaderBlock>
  );
}

const styles = StyleSheet.create({
  header: { marginHorizontal: -spacing.screenX },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  titles: { flex: 1, gap: 6 },
});
