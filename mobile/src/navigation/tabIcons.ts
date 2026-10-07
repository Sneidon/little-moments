import { Platform, type ImageSourcePropType } from 'react-native';
import type { NativeBottomTabIcon } from '@react-navigation/bottom-tabs/unstable';

type SfSymbolName = Extract<NativeBottomTabIcon, { type: 'sfSymbol' }>['name'];

/**
 * Native tab icon: SF Symbol on iOS (outline, filled when focused), and a PNG
 * rendered from the app's icon fonts on Android (see scripts/build-tab-icons.py).
 */
function tabIcon(sfOutline: SfSymbolName, sfFilled: SfSymbolName, androidSource: ImageSourcePropType) {
  return ({ focused }: { focused: boolean }): NativeBottomTabIcon =>
    Platform.OS === 'ios'
      ? { type: 'sfSymbol', name: focused ? sfFilled : sfOutline }
      : { type: 'image', source: androidSource };
}

export const TAB_ICONS = {
  dashboard: tabIcon('square.grid.2x2', 'square.grid.2x2.fill', require('../../assets/tab-icons/dashboard.png')),
  students: tabIcon('figure.child', 'figure.child', require('../../assets/tab-icons/students.png')),
  messages: tabIcon(
    'bubble.left.and.bubble.right',
    'bubble.left.and.bubble.right.fill',
    require('../../assets/tab-icons/messages.png')
  ),
  profile: tabIcon('person', 'person.fill', require('../../assets/tab-icons/profile.png')),
  home: tabIcon('house', 'house.fill', require('../../assets/tab-icons/home.png')),
  media: tabIcon('photo.on.rectangle', 'photo.on.rectangle.angled', require('../../assets/tab-icons/media.png')),
  calendar: tabIcon('calendar', 'calendar', require('../../assets/tab-icons/calendar.png')),
  settings: tabIcon('gearshape', 'gearshape.fill', require('../../assets/tab-icons/settings.png')),
};
