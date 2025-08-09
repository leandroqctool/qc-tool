## QC Tool — Enterprise-Modern UI Design System (Vercel + NextAuth)

## 🎨 Design Philosophy

- Sophisticated minimalism; enterprise-modern
- Space, clarity, and contrast; no gradients or oversized elements
- Primary accent `#0D99FF` only for main actions

## 🎯 Color System

```css
:root {
  /* Brand */
  --primary: #0D99FF;
  --primary-hover: #0B87E5;
  --primary-light: #E6F3FF;

  /* Neutrals */
  --background: #FAFBFC;
  --surface: #FFFFFF;
  --surface-dark: #2D2D2D;
  --surface-selected: #383838;

  /* Typography */
  --text-primary: #1A2332;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;
}
```

Forbidden: `#334255`, `#475669`. Prefer `#2D2D2D` for dark surfaces.

## 🧱 Typography

- Base font: Geist Sans (via `next/font`), fallback `system-ui`
- Body color: `var(--text-primary)`

## 🧩 Components (Radix UI)

- Dialog, Dropdown Menu, Tabs, Toast, Select, Progress
- Compose with Tailwind utilities; ensure focus styles are visible and consistent

## 🧭 Layout System

- Collapsible sidebar; fixed header with centered search; avatar and notifications on right
- Card grid on dashboard (inspired by hiking app cards)

### Card Pattern

```tsx
<div className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
  <div className="relative h-64 bg-gradient-to-br from-[#0D99FF] to-[#6366F1]">
    <div className="absolute bottom-0 left-0 right-0 p-6">
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <div className="flex items-center text-white/90 text-sm mb-4">
        <MapPin className="w-4 h-4 mr-1" />
        {subtitle}
      </div>
      <button className="bg-white text-gray-900 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
        Start QC <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
  <div className="p-6 bg-white">{/* Stats section */}</div>
  </div>
```

## 🧪 Tailwind v4 Usage

- Design tokens defined in `app/globals.css` using CSS variables
- Prefer semantic classes in components; refrain from arbitrary hex except `#0D99FF`
- Accessible focus ring: outline `var(--primary)` with offset

## ♿ Accessibility

- Keyboard navigable; visible focus; semantic headings
- Radix primitives provide ARIA attributes; keep contrast ratios AA+

## 🔁 Patterns to Reuse

- Status badges, file upload progress bars, tables with sticky headers, responsive cards

## ✅ UI Success Criteria

- Consistent use of color system
- No banned colors; primary used sparingly for key CTAs
- Smooth hover/active states; transitions under 200–300ms

# QC Tool - Enterprise-Modern UI Design System

## 🎨 **DESIGN PHILOSOPHY**

**"Sophisticated Minimalism"** - Enterprise-grade aesthetics with modern 2025 trends

### **Core Principles**
- **Clean & Spacious**: Purposeful whitespace, subtle shadows
- **Professional Typography**: Clear hierarchy, readable fonts  
- **Minimalistic Approach**: No gradients, no oversized elements
- **Strategic Color Use**: Muted palette with #0D99FF accent

---

## 🎯 **COLOR SYSTEM**

### **Primary Brand Colors**
```css
:root {
  /* Primary Actions */
  --primary: #0D99FF;        /* Bright blue buttons (user specified) */
  --primary-hover: #0B87E5;  /* Hover state */
  --primary-light: #E6F3FF;  /* Light backgrounds */
  
  /* Enterprise Neutrals */
  --background: #FAFBFC;     /* Soft white background */
  --surface: #FFFFFF;        /* Card/panel backgrounds */
  --surface-dark: #2D2D2D;   /* Dark theme surfaces */
  --surface-selected: #383838; /* Selected tabs */
  
  /* Typography */
  --text-primary: #1A2332;   /* Main text */
  --text-secondary: #64748B; /* Secondary text */
  --text-muted: #94A3B8;     /* Disabled/placeholder */
}
```

### **Forbidden Colors**
- ❌ **#334255** (banned)
- ❌ **#475669** (banned)  
- ✅ Use **#2D2D2D** throughout project instead

---

## 🃏 **CARD DESIGN SYSTEM**

### **Inspired by Hiking App Aesthetic**
Beautiful cards with image backgrounds and overlays - exactly like user's inspiration.

**Key Features:**
- Background images or gradients for visual appeal
- Status badges (like "Popular" → project status)
- Action buttons (like "Start Route" → "Start QC")
- Stats sections with metrics (files, size, duration)
- Progress indicators and ratings
- Hover effects with subtle scale and shadow changes

### **Card Component Pattern**
```tsx
<div className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
  {/* Background Image/Gradient */}
  <div className="relative h-64 bg-gradient-to-br from-[#0D99FF] to-[#6366F1]">
    {/* Status Badge */}
    <div className="absolute top-4 left-4">
      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium rounded-full">
        {project.status}
      </span>
    </div>
    
    {/* Content Overlay */}
    <div className="absolute bottom-0 left-0 right-0 p-6">
      <h3 className="text-xl font-semibold text-white mb-2">{project.name}</h3>
      <div className="flex items-center text-white/90 text-sm mb-4">
        <MapPin className="w-4 h-4 mr-1" />
        {project.client}
      </div>
      <button className="bg-white text-gray-900 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 flex items-center gap-2">
        Start QC <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
  
  {/* Stats Section */}
  <div className="p-6 bg-white">
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="text-lg font-semibold text-gray-900">{fileCount}</div>
        <div className="text-xs text-gray-500">Files</div>
      </div>
      {/* More stats... */}
    </div>
  </div>
</div>
```

---

## 📱 **LAYOUT SYSTEM**

### **Dashboard Layout Structure**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [☰] QC Tool          [🔍 Search Files/Projects]     [🔔] [👤 Avatar] │ ← Header
├─────────────────────────────────────────────────────────────────────┤
│ [Hidden Sidebar]                                                    │
│ │ 📊 Dashboard                                                       │
│ │ 📁 Files                                                           │  
│ │ 📋 Projects                                                        │
│ │ ✅ QC Reviews                                                       │
│ │ 👥 Users                                                           │
│                                                                     │
│    🃏 Beautiful Cards Grid (like hiking app)                       │
│    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│    │[Background]  │ │[Background]  │ │[Background]  │              │
│    │   Image      │ │   Image      │ │   Image      │              │
│    │Project Name  │ │Project Name  │ │Project Name  │              │
│    │📍 Client     │ │📍 Client     │ │📍 Client     │              │
│    │[Start QC] ▶️ │ │[Start QC] ▶️ │ │[Start QC] ▶️ │              │
│    └──────────────┘ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### **Layout Features**
- **Collapsible sidebar** (hidden by default, button to show)
- **Fixed header** with search bar in center
- **Avatar and notifications** on the right  
- **Card-based main content** area
- **Mobile-responsive** behavior

---

## 🧩 **RADIX UI COMPONENTS**

### **Essential Components**
- **Dialog** - QC review modals, file upload dialogs
- **Select** - Status dropdowns, user role selection
- **Table** - File listings, QC review tables
- **Form** - User registration, project creation
- **Tabs** - Dashboard navigation, file categories
- **Progress** - Upload progress, QC completion status
- **Toast** - Success/error notifications
- **Dropdown Menu** - User actions, file operations

### **Button Variants**
```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[#0D99FF] text-white hover:bg-[#0B87E5]',
        'qc-approve': 'bg-green-500 text-white hover:bg-green-600',
        'qc-reject': 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
      }
    }
  }
)
```

---

## 🎨 **COMPONENT EXAMPLES**

### **QC Status Badge**
```tsx
const QCStatusBadge = ({ status, showProgress, progress }) => {
  const configs = {
    'PENDING': { color: 'bg-gray-100 text-gray-800', icon: '⏳' },
    'IN_QC': { color: 'bg-blue-100 text-blue-800', icon: '🔍' },
    'APPROVED': { color: 'bg-green-100 text-green-800', icon: '✅' },
    'REJECTED': { color: 'bg-red-100 text-red-800', icon: '❌' },
  }
  
  return (
    <div className="flex items-center space-x-3">
      <div className={`px-3 py-1 text-xs rounded-full ${configs[status].color}`}>
        <span className="mr-1">{configs[status].icon}</span>
        {status.replace('_', ' ')}
      </div>
      {showProgress && (
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div className="bg-[#0D99FF] h-2 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
```

### **File Preview Component**
```tsx
const FilePreview = ({ file }) => (
  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">{file.name}</h3>
      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
        <span>{file.size}</span>
        <span>{file.uploadedAt}</span>
        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{file.type}</span>
      </div>
    </div>
    <div className="p-6 bg-gray-50 min-h-96 flex items-center justify-center">
      {file.type.startsWith('image/') ? (
        <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain" />
      ) : (
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Preview not available</p>
        </div>
      )}
    </div>
  </div>
)
```

---

## 🚀 **IMPLEMENTATION CHECKLIST**

### **✅ Design System**
- [ ] Install Radix UI components
- [ ] Configure Tailwind CSS v4  
- [ ] Set up color variables (#0D99FF primary)
- [ ] Create base component library

### **✅ Layout**
- [ ] Build collapsible sidebar navigation
- [ ] Create header with search and avatar
- [ ] Implement card-based project interface
- [ ] Add mobile-responsive behavior

### **✅ Components**
- [ ] QC status badges with progress
- [ ] File preview components
- [ ] Data tables with sorting/filtering
- [ ] Form components with validation

### **✅ Quality**
- [ ] WCAG 2.1 compliance
- [ ] Keyboard navigation
- [ ] Loading states
- [ ] Error boundaries

---

## 🎯 **DESIGN OUTCOMES**

This enterprise-modern design system delivers:

**✅ Professional Aesthetics**
- Clean, minimalistic interface
- Sophisticated color palette (#0D99FF primary)
- Card-based layout inspired by hiking app
- Enterprise-grade typography

**✅ Modern User Experience**  
- Intuitive navigation patterns
- Smooth animations and transitions
- Responsive across all devices
- Accessible to all users

**✅ Developer Experience**
- Type-safe component props
- Consistent design tokens
- Reusable component patterns
- Comprehensive documentation

The result is a **beautiful, functional, and maintainable** UI that matches modern enterprise standards while providing an exceptional user experience for QC workflows.
