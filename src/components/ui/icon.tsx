import { forwardRef } from 'react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconName = keyof typeof LucideIcons

export interface IconProps extends Omit<LucideIcons.LucideProps, 'ref'> {
  name: IconName
}

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const

export type IconSize = keyof typeof sizeMap

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 'md', className, ...props }, ref) => {
    const IconComponent = LucideIcons[name] as LucideIcons.LucideIcon

    if (!IconComponent) {
      console.warn(`Icon "${name}" not found in lucide-react`)
      return null
    }

    return (
      <IconComponent
        ref={ref}
        size={typeof size === 'number' ? size : sizeMap[size as IconSize]}
        className={cn('shrink-0', className)}
        {...props}
      />
    )
  }
)
Icon.displayName = 'Icon'

// Re-export commonly used icons for direct import
export {
  // Navigation & Actions
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Minus,
  MoreHorizontal,
  MoreVertical,

  // Status & Feedback
  Check,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,

  // User & Auth
  User,
  Users,
  LogIn,
  LogOut,
  Settings,
  UserPlus,

  // Content & Editing
  Edit,
  Trash2,
  Save,
  Copy,
  Clipboard,
  FileText,
  MessageSquare,

  // Projects & Issues
  Folder,
  FolderOpen,
  Circle,
  Flag,
  Clock,
  Calendar,
  Tag,
  Bookmark,
  Star,

  // UI Elements
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ExternalLink,
  Link2,
  Mail,
  Send,

  // Arrows & Movement
  Move,
  GripVertical,
  ArrowUp,
  ArrowDown,

  // Misc
  Bell,
  HelpCircle,
  Home,
  LayoutGrid,
  List,
} from 'lucide-react'
