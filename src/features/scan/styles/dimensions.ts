import { Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
/** A4 frame: 72% screen width — ~30cm rahat dirsek mesafesinde A4 sığar */
export const GUIDE_W = Math.round(SCREEN_W * 0.72);
export const GUIDE_H = Math.round(GUIDE_W * 1.414);
