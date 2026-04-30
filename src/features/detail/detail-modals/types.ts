export type MoreMenuGroup = 'main' | 'communication' | 'secondary' | 'advanced';

export interface MoreMenuItem {
  key: string;
  icon: string;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  /** Gruppe: main & communication oben; secondary+advanced erscheinen zusammen unter „Weitere Werkzeuge“. */
  group?: MoreMenuGroup;
}
