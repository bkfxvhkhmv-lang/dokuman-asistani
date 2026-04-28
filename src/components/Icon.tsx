import React from 'react';
import {
  Bell, BellSlash,
  File, FileText, Files,
  MagnifyingGlass,
  House,
  User, Users,
  Camera, CameraSlash,
  CheckCircle, Check,
  WarningCircle, Warning,
  X, XCircle,
  CaretRight, CaretLeft, CaretDown, CaretUp,
  Clock,
  CalendarBlank, CalendarCheck,
  Envelope,
  Lightning, LightningSlash,
  Images, Stack,
  Scan,
  QrCode,
  Lightbulb,
  ArrowsClockwise,
  ArrowsCounterClockwise,
  FrameCorners,
  Copy,
  Newspaper,
  Info,
  LockKey, Lock,
  Key,
  Folder, FolderOpen,
  Sparkle,
  Cpu,
  ChatTeardrop,
  ChartBar,
  Money,
  PencilSimple, PencilLine,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  DotsThree,
  Gear,
  Trash,
  Eye, EyeSlash,
  Share,
  Download,
  Upload,
  MapPin,
  Phone,
  Globe,
  Star,
  Heart,
  ShieldCheck,
  Tag,
  Funnel,
  SortAscending,
  Plus,
  Minus,
  List,
  SquaresFour,
  BookOpen,
  Archive,
  Receipt,
  Car,
  Buildings,
  Scissors,
  SlidersHorizontal,
  Moon,
  Eyeglasses,
} from 'phosphor-react-native';
import { ViewStyle } from 'react-native';
import { Colors } from '../theme';

type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  weight?: IconWeight;
  style?: ViewStyle | ViewStyle[];
  shadow?: boolean;
};

const MAP: Record<string, React.ComponentType<any>> = {
  // Bell
  'bell':                     Bell,
  'bell-outline':              Bell,
  'bell-slash':                BellSlash,
  'notifications':             Bell,
  'notifications-outline':     Bell,
  // File
  'document':                  File,
  'document-outline':          File,
  'document-text':             FileText,
  'document-text-outline':     FileText,
  'documents-outline':         Files,
  'file':                      File,
  'file-text':                 FileText,
  'files':                     Files,
  // Search
  'search':                    MagnifyingGlass,
  'search-outline':            MagnifyingGlass,
  'magnifying-glass':          MagnifyingGlass,
  // Home
  'home':                      House,
  'home-outline':              House,
  // User
  'person':                    User,
  'person-outline':            User,
  'user':                      User,
  'user-circle':               User,
  'people-outline':            Users,
  // Camera
  'camera':                    Camera,
  'camera-outline':            Camera,
  'camera-off':                CameraSlash,
  'camera-slash':              CameraSlash,
  // Checkmark
  'checkmark-circle':          CheckCircle,
  'checkmark-circle-outline':  CheckCircle,
  'checkmark':                 Check,
  'check':                     Check,
  // Warning
  'alert-circle':              WarningCircle,
  'alert-circle-outline':      WarningCircle,
  'warning-circle':            WarningCircle,
  'alert':                     Warning,
  'warning-outline':           Warning,
  // Close / X
  'close':                     X,
  'x':                         X,
  'close-circle':              XCircle,
  'x-circle':                  XCircle,
  // Chevrons / Carets
  'chevron-forward':           CaretRight,
  'chevron-forward-outline':   CaretRight,
  'chevron-right':             CaretRight,
  'chevron-back':              CaretLeft,
  'chevron-down':              CaretDown,
  'chevron-up':                CaretUp,
  'caret-right':               CaretRight,
  // Arrow circle
  'arrow-forward-circle':      CaretRight,
  // Time
  'time':                      Clock,
  'time-outline':              Clock,
  'hourglass-outline':         Clock,
  'clock':                     Clock,
  // Calendar
  'calendar':                  CalendarBlank,
  'calendar-outline':          CalendarBlank,
  'calendar-check':            CalendarCheck,
  // Mail / Envelope
  'mail':                      Envelope,
  'mail-outline':              Envelope,
  'envelope':                  Envelope,
  // Flash / Lightning / Bolt
  'flash':                     Lightning,
  'bolt':                      Lightning,
  'flash-outline':             Lightning,
  'flash-off':                 LightningSlash,
  'lightning':                 Lightning,
  // Images
  'images-outline':            Images,
  'albums-outline':            Stack,
  'image':                     Images,
  'image-outline':             Images,
  'images':                    Images,
  // Scan / QR
  'scan':                      Scan,
  'scan-outline':              Scan,
  'qr-code-outline':           QrCode,
  // Lightbulb
  'bulb':                      Lightbulb,
  'bulb-outline':              Lightbulb,
  'lightbulb':                 Lightbulb,
  // Refresh / Sync / Rotate
  'refresh-outline':           ArrowsClockwise,
  'reload-outline':            ArrowsClockwise,
  'sync-outline':              ArrowsClockwise,
  'refresh':                   ArrowsClockwise,
  'arrow-clockwise':           ArrowsClockwise,
  'rotate-right':              ArrowsClockwise,
  'arrow-counter-clockwise':   ArrowsCounterClockwise,
  'rotate-left':               ArrowsCounterClockwise,
  'frame-corners':             FrameCorners,
  // Copy
  'copy-outline':              Copy,
  // Reader / Newspaper
  'reader-outline':            Newspaper,
  // Info
  'information-circle-outline': Info,
  'information-circle':        Info,
  'info':                      Info,
  // Lock / Key
  'lock-closed-outline':       LockKey,
  'lock-closed':               LockKey,
  'lock':                      Lock,
  'key':                       Key,
  'key-outline':               Key,
  // Folder
  'folder':                    Folder,
  'folder-outline':            Folder,
  'folder-open':               FolderOpen,
  'folder-open-outline':       FolderOpen,
  // Sparkle / Magic
  'sparkles-outline':          Sparkle,
  'sparkle':                   Sparkle,
  'magic':                     Sparkle,
  'magic-wand':                Sparkle,
  'wand':                      Sparkle,
  // CPU
  'hardware-chip-outline':     Cpu,
  // Chat
  'chatbubble-outline':        ChatTeardrop,
  'chatbubble-ellipses-outline': ChatTeardrop,
  // Analytics / Chart
  'analytics-outline':         ChartBar,
  'chart-bar':                 ChartBar,
  'stats-chart-outline':       ChartBar,
  // Money / Card / Currency
  'cash':                      Money,
  'card':                      Money,
  'currency':                  Money,
  'bank':                      Buildings,
  // Edit / Pencil
  'create':                    PencilSimple,
  'create-outline':            PencilSimple,
  'pencil':                    PencilSimple,
  'pencil-outline':            PencilSimple,
  'pencil-simple':             PencilSimple,
  'pencil-line':               PencilLine,
  // Arrow
  'arrow-back':                ArrowLeft,
  'arrow-forward':             ArrowRight,
  'arrow-up':                  ArrowUp,
  'arrow-down':                ArrowDown,
  'arrow-left':                ArrowLeft,
  'arrow-right':               ArrowRight,
  // Sliders
  'options-outline':           SlidersHorizontal,
  'sliders-outline':           SlidersHorizontal,
  'sliders-horizontal':        SlidersHorizontal,
  'adjust':                    SlidersHorizontal,
  // More / Ellipsis
  'ellipsis-horizontal':       DotsThree,
  'dots-three':                DotsThree,
  // Settings / Gear
  'settings-outline':          Gear,
  'settings':                  Gear,
  'gear':                      Gear,
  // Trash
  'trash-outline':             Trash,
  'trash':                     Trash,
  // Eye
  'eye':                       Eye,
  'eye-outline':               Eye,
  'eye-off-outline':           EyeSlash,
  'eye-slash':                 EyeSlash,
  // Share
  'share-outline':             Share,
  'share-social-outline':      Share,
  'share-social':              Share,
  'share':                     Share,
  // Download / Upload
  'download-outline':          Download,
  'download':                  Download,
  'cloud-upload':              Upload,
  'cloud-upload-outline':      Upload,
  'upload':                    Upload,
  // Archive
  'archive':                   Archive,
  // Receipt
  'receipt-outline':           Receipt,
  'receipt':                   Receipt,
  // Vehicle / Car
  'car-sport-outline':         Car,
  'car':                       Car,
  // Building / Business
  'business-outline':          Buildings,
  'buildings':                 Buildings,
  // Scissors / Crop
  'cut-outline':               Scissors,
  'scissors':                  Scissors,
  'crop':                      Scissors,
  // Map
  'location-outline':          MapPin,
  'map-pin':                   MapPin,
  // Phone
  'call-outline':              Phone,
  'phone':                     Phone,
  // Globe
  'globe-outline':             Globe,
  'globe':                     Globe,
  // Star
  'star':                      Star,
  'star-outline':              Star,
  // Heart
  'heart-outline':             Heart,
  'heart':                     Heart,
  // Shield
  'shield-checkmark-outline':  ShieldCheck,
  'shield-check':              ShieldCheck,
  // Tag / Hash
  'pricetag-outline':          Tag,
  'tag':                       Tag,
  'hash':                      Tag,
  // Filter / Funnel
  'filter-outline':            Funnel,
  'funnel':                    Funnel,
  // Sort
  'swap-vertical-outline':     SortAscending,
  // Plus / Minus
  'add':                       Plus,
  'add-circle-outline':        Plus,
  'plus':                      Plus,
  'remove-outline':            Minus,
  'minus':                     Minus,
  // List / Grid
  'list-outline':              List,
  'list':                      List,
  'grid-outline':              SquaresFour,
  'squares-four':              SquaresFour,
  // Book
  'book-outline':              BookOpen,
  // Storefront — fallback to Buildings
  'storefront':                Buildings,
  // Moon / dark mode
  'moon-outline':              Moon,
  'moon':                      Moon,
  // Eyeglasses / simple mode
  'glasses-outline':           Eyeglasses,
  'eyeglasses':                Eyeglasses,
};

const WEIGHT_MAP: Record<string, IconWeight> = {
  // Outline → light weight
  'bell-outline': 'light', 'document-outline': 'light', 'document-text-outline': 'light',
  'documents-outline': 'light', 'search-outline': 'light', 'home-outline': 'light',
  'person-outline': 'light', 'camera-outline': 'light', 'checkmark-circle-outline': 'light',
  'alert-circle-outline': 'light', 'time-outline': 'light', 'calendar-outline': 'light',
  'mail-outline': 'light', 'images-outline': 'light', 'albums-outline': 'light',
  'scan-outline': 'light', 'qr-code-outline': 'light', 'bulb-outline': 'light',
  'refresh-outline': 'light', 'reload-outline': 'light', 'sync-outline': 'light',
  'warning-outline': 'light', 'flash-outline': 'light', 'receipt-outline': 'light',
  'car-sport-outline': 'light', 'business-outline': 'light', 'folder-open-outline': 'light',
  'stats-chart-outline': 'light', 'cut-outline': 'light', 'copy-outline': 'light',
  'reader-outline': 'light', 'information-circle-outline': 'light', 'lock-closed-outline': 'light',
  'folder-outline': 'light', 'sparkles-outline': 'light', 'hardware-chip-outline': 'light',
  'chatbubble-outline': 'light', 'analytics-outline': 'light', 'create-outline': 'light',
  'settings-outline': 'light', 'trash-outline': 'light', 'eye-outline': 'light',
  'eye-off-outline': 'light', 'share-outline': 'light', 'share-social-outline': 'light',
  'download-outline': 'light', 'cloud-upload-outline': 'light', 'location-outline': 'light',
  'call-outline': 'light', 'globe-outline': 'light', 'star-outline': 'light',
  'heart-outline': 'light', 'shield-checkmark-outline': 'light', 'pricetag-outline': 'light',
  'filter-outline': 'light', 'swap-vertical-outline': 'light', 'add-circle-outline': 'light',
  'remove-outline': 'light', 'list-outline': 'light', 'grid-outline': 'light',
  'book-outline': 'light', 'options-outline': 'light', 'sliders-outline': 'light',
  'key-outline': 'light', 'pencil-outline': 'light',
  'moon-outline': 'light', 'glasses-outline': 'light',
  // Filled variants
  'bell': 'fill', 'notifications': 'fill', 'home': 'fill', 'person': 'fill',
  'checkmark-circle': 'fill', 'alert-circle': 'fill', 'warning-circle': 'fill',
  'calendar-check': 'fill', 'mail': 'fill', 'flash': 'fill', 'lightning': 'fill',
  'folder': 'fill', 'star': 'fill', 'lock-closed': 'fill', 'receipt': 'fill',
  'car': 'fill', 'buildings': 'fill', 'shield-check': 'fill',
};

export default function Icon({
  name,
  size = 20,
  color = Colors.text,
  weight,
  style = {},
  shadow = false,
}: IconProps) {
  const Component = MAP[name];
  if (!Component) return null;

  const resolvedWeight = weight ?? WEIGHT_MAP[name] ?? 'regular';

  const iconStyle = shadow
    ? [{ shadowColor: color, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, style]
    : style;

  return <Component size={size} color={color} weight={resolvedWeight} style={iconStyle} />;
}
