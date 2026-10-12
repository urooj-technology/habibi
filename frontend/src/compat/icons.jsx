// Icon aliases (legacy page names → lucide-react).
import React from 'react';
import {
  Network,
  Plus,
  ArrowLeft,
  DollarSign,
  UserSquare,
  Building2,
  Calendar,
  X as XIcon,
  Boxes,
  CheckCircle2,
  Eraser,
  UserRound,
  Phone,
  Trash2,
  Download as DownloadLucide,
  Pencil,
  ChevronDown,
  Filter,
  UserPlus,
  Info as InfoLucide,
  Package,
  CornerDownLeft,
  Banknote,
  MapPin,
  MoreVertical,
  StickyNote,
  Coins,
  Clock,
  User as UserLucide,
  Play,
  Printer,
  Upload as UploadLucide,
  Receipt as ReceiptLucide,
  Save as SaveLucide,
  Search as SearchLucide,
  ShoppingBasket as BasketLucide,
  ShoppingCart as CartLucide,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

const wrap = (Comp) => {
  const Icon = React.forwardRef(({ fontSize, sx, style, className, ...rest }, ref) => {
    const sizeMap = { small: 16, medium: 20, large: 24, inherit: undefined };
    const size = typeof fontSize === 'string' ? sizeMap[fontSize] : fontSize;
    return (
      <Comp
        ref={ref}
        size={size}
        className={className}
        style={{ ...(sx || {}), ...(style || {}) }}
        {...rest}
      />
    );
  });
  Icon.displayName = Comp.displayName || Comp.name || 'Icon';
  return Icon;
};

export const AccountTree = wrap(Network);
export const Add = wrap(Plus);
export const ArrowBack = wrap(ArrowLeft);
export const AttachMoney = wrap(DollarSign);
export const Badge = wrap(UserSquare);
export const Business = wrap(Building2);
export const CalendarToday = wrap(Calendar);
export const Cancel = wrap(XIcon);
export const Category = wrap(Boxes);
export const CheckCircle = wrap(CheckCircle2);
export const Clear = wrap(Eraser);
export const Close = wrap(XIcon);
export const ContactPhone = wrap(Phone);
export const Delete = wrap(Trash2);
export const Download = wrap(DownloadLucide);
export const Edit = wrap(Pencil);
export const ExpandMore = wrap(ChevronDown);
export const FilterList = wrap(Filter);
export const GroupAdd = wrap(UserPlus);
export const Info = wrap(InfoLucide);
export const Inventory = wrap(Package);
export const KeyboardReturn = wrap(CornerDownLeft);
export const LocalAtm = wrap(Banknote);
export const LocationOn = wrap(MapPin);
export const MoreVert = wrap(MoreVertical);
export const Notes = wrap(StickyNote);
export const Paid = wrap(Coins);
export const Pending = wrap(Clock);
export const Person = wrap(UserLucide);
export const PersonAdd = wrap(UserPlus);
export const PlayArrow = wrap(Play);
export const Print = wrap(Printer);
export const Publish = wrap(UploadLucide);
export const Receipt = wrap(ReceiptLucide);
export const ReceiptLong = wrap(ReceiptLucide);
export const Save = wrap(SaveLucide);
export const Search = wrap(SearchLucide);
export const ShoppingBasket = wrap(BasketLucide);
export const ShoppingCart = wrap(CartLucide);
export const Tune = wrap(SlidersHorizontal);
export const Update = wrap(RefreshCw);
export const Upload = wrap(UploadLucide);
export const Visibility = wrap(Eye);
export const VisibilityOff = wrap(EyeOff);
export const Warning = wrap(AlertTriangle);
