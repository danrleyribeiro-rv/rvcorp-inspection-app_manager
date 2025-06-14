# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (uses Turbopack for faster builds)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Linting**: `npm run lint`

## Project Architecture

This is a Next.js 15 application using the App Router pattern with a Firebase backend, designed as a management platform for the "Lince Inspection App".

### Tech Stack
- **Frontend**: Next.js 15 with React 19, App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Firebase (Firestore, Auth, Storage)
- **State Management**: React Context (auth, notifications, loading)
- **Authentication**: Firebase Auth with manager role verification
- **File Storage**: AWS S3 with Firebase integration

### Application Structure

The app follows a role-based access pattern where only authenticated managers can access the platform:

1. **Authentication Flow**: 
   - Users must be registered in the `managers` collection in Firestore
   - Special test user: `danrley@post.com` has automatic access
   - Auth state managed through cookies and Firebase Auth
   - Middleware handles route protection and redirects

2. **Main Modules**:
   - **Inspections**: Core inspection management with media handling, templates, and reports
   - **Templates**: Inspection template creation with drag-and-drop editor
   - **Projects**: Project management with Kanban and table views
   - **Clients**: Client management with transfer capabilities
   - **Inspectors**: Inspector profiles and ratings
   - **Chats**: Communication system with file upload
   - **Reports**: Report generation and viewing

### Key Architectural Patterns

- **Route Groups**: Uses Next.js route groups `(auth)` and `(dashboard)` for organization
- **Context Providers**: Layered context providers for auth, notifications, loading, and theme
- **Service Layer**: Centralized Firebase operations in `/src/services/`
- **Component Architecture**: Reusable UI components in `/src/components/ui/` following shadcn/ui patterns
- **Hooks**: Custom hooks for data fetching and state management in `/src/hooks/`

### Firebase Integration

- **Collections**: `templates`, `managers`, and other domain-specific collections
- **Auth**: Email/password with manager role verification
- **Storage**: Firebase Storage for media files
- **Real-time**: Uses Firestore real-time listeners where needed

### Environment Requirements

Required environment variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Code Conventions

- Portuguese language for UI text and comments (Brazilian Portuguese)
- File naming: kebab-case for pages, PascalCase for components
- Service layer uses camelCase method names with descriptive error handling
- Components follow shadcn/ui patterns with proper TypeScript-like prop handling
- Firebase operations include proper error handling and timestamp formatting

## Detailed Screen Documentation

### Authentication Screens (`(auth)` route group)

#### Login Screen (`/login`)
- Email/password authentication with Firebase
- Manager role verification (must exist in `managers` collection)
- Special test user access for `danrley@post.com`
- Redirect to dashboard on successful auth
- Password reset link integration

#### Forgot Password (`/forgot-password`)
- Send password reset email via Firebase Auth
- Email validation and error handling
- Redirect to login after email sent

#### Reset Password (`/reset-password`)
- Complete password reset flow with secure token validation
- New password confirmation
- Automatic login after successful reset

### Dashboard Screens (`(dashboard)` route group)

#### Main Dashboard (`/dashboard`)
- **Statistics Overview**: Cards showing totals for projects, inspections, clients, templates
- **Analytics Charts**: 
  - Project type distribution (pie chart)
  - Inspection status breakdown (pie chart)
  - Monthly inspection trends (bar chart)
- **Recent Projects**: List of recently created projects with quick access
- **Performance Indicators**: Completion rates and inspector workload
- **Real-time Updates**: Auto-updating with Firestore subscriptions

#### Projects Management (`/projects`)
- **Dual View System**:
  - **Table View**: Detailed project list with sorting, filtering, and search
  - **Kanban View**: Visual project status board (pending → in_progress → completed → canceled)
- **Project Features**:
  - Client association and management
  - Project type categorization
  - Status tracking with visual indicators
  - CRUD operations with validation
  - Project transfer between managers
  - Soft delete functionality with restoration

#### Inspections Management (`/inspections`)
- **Advanced Filtering Panel**: Status, project, inspector, location, date range
- **Full-text Search**: Across all inspection fields and metadata
- **Infinite Scroll**: Performance-optimized pagination for large datasets
- **Bulk Operations**: Multi-select actions for status updates
- **Quick Actions**: Direct access to edit, view, and chat
- **Status Workflow**: Visual progression tracking

#### Inspection Editor (`/inspections/[id]/editor`)
**Most complex screen with tabbed interface:**

**General Information Tab:**
- Basic inspection metadata (title, description, location)
- Area measurements and calculations
- General observations and notes
- Creation/update timestamps and audit trail

**Structure Tab (3-Column Layout):**
- **Topics Column**: Hierarchical inspection structure navigation
- **Items Column**: Sub-components within selected topic
- **Details Column**: Specific inspection points featuring:
  - Multiple field types (text, number, select, boolean, measurements)
  - Media upload system with drag-and-drop
  - Image/video watermarking for authenticity
  - Non-conformity tracking with severity levels
  - Media organization and movement between details

**Control Tab:**
- Delivery status management and workflow
- Edit blocking controls for finalized inspections
- Inspector activity tracking and last editor info
- Release management for version control

**Advanced Features:**
- **Auto-save System**: Detects unsaved changes with exit confirmation
- **Real-time Collaboration**: Prevents editing conflicts
- **Media Management**: Comprehensive file handling with watermarks
- **Non-Conformity System**: Issue tracking with corrective actions and deadlines

#### Templates System (`/templates`)
- **Template Library**: Browse and manage reusable inspection structures
- **Template Creation Dialog**: Quick setup for new templates
- **Import/Export**: Template sharing and backup functionality
- **Usage Statistics**: Track template adoption and effectiveness

#### Template Editor (`/templates/[id]/editor`)
- **General Configuration**: Title, description, pricing, icon selection, color theming
- **Structure Definition**: Build inspection hierarchy (topics → items → details)
- **Field Configuration**: Define input types and validation rules
- **Code Generation**: Automatic unique template codes
- **Preview System**: Test template structure before deployment

#### Inspectors Directory (`/inspectors`)
- **Inspector Profiles**: Comprehensive professional information display
- **Multi-criteria Rating System**: Evaluate inspectors across different dimensions
- **Location-based Filtering**: Search by state/city for local inspectors
- **Direct Communication**: Integrated chat access from profiles
- **Professional Details**: Certifications, experience levels, specializations

#### Clients Management (`/clients`)
- **Client Database**: Comprehensive contact and business information
- **CRUD Operations**: Full lifecycle management of client records
- **Client Transfer**: Move clients between managers with audit trail
- **Project Association**: Link clients to multiple projects
- **Segment Categorization**: Organize clients by business type

#### Reports System (`/reports`)
- **Inspection Reports**: Generate professional PDF reports from completed inspections
- **Advanced Filtering**: Status, completion level, project association, date ranges
- **Report Statistics**: Progress tracking and completion indicators
- **Release System**: Version control for inspection reports with history
- **Preview Generation**: Draft reports before final delivery

#### Chat System (`/chats`)
- **Real-time Messaging**: Firebase-powered instant communication
- **Context-aware Chats**: Inspection-specific conversation threads
- **File Sharing**: Media attachments with preview capabilities
- **Notification System**: Unread message tracking with badges
- **Chat Management**: Mute, settings, and conversation organization

#### Settings (`/settings`)
**5 Settings Categories:**

**Profile Tab:**
- Personal information management
- Profile picture upload and management
- Professional details and contact info

**Notifications Tab:**
- Email notification preferences
- Push notification controls
- Chat notification settings
- Inspection alert configuration

**Application Tab:**
- Date format preferences
- Default view selection (list/kanban)
- Auto-save interval settings

**Appearance Tab:**
- Theme selection (light/dark mode)
- UI density preferences

**Security Tab:**
- Password change functionality with validation
- Account security settings and audit

### Navigation & Layout System

#### Sidebar Navigation
- **Collapsible Design**: Space-efficient navigation
- **User Profile Section**: Quick access to user info and logout
- **Menu Items**: Hierarchical navigation with active state indicators
- **Unread Notifications**: Real-time chat notification badges
- **Quick Action Buttons**: Direct access to frequently used features

#### Mobile Responsive Design
- **Hamburger Menu**: Mobile-optimized navigation
- **Touch-friendly**: Optimized for mobile interactions
- **Responsive Breakpoints**: Adaptive layout for different screen sizes

### Key Components & Features

#### Media Management System
- **Drag-and-drop Upload**: Intuitive file handling
- **Image Watermarking**: Automatic authenticity marking
- **Video Processing**: Optimized video handling
- **Media Organization**: Move files between inspection details
- **Preview System**: Inline media viewing

#### Non-Conformity Tracking
- **Issue Classification**: Severity levels and categories
- **Corrective Actions**: Track remediation steps
- **Deadline Management**: Time-bound resolution tracking
- **Status Workflow**: Issue lifecycle management

#### Real-time Features
- **Firestore Subscriptions**: Live data updates
- **Chat Notifications**: Instant message alerts
- **Collaborative Editing**: Prevent editing conflicts
- **Activity Tracking**: Monitor user actions

### Data Flow & Relationships

#### Primary Workflows
1. **Project Creation** → **Template Selection** → **Inspection Creation** → **Inspector Assignment**
2. **Inspection Monitoring** → **Progress Tracking** → **Report Generation** → **Client Delivery**
3. **Template Management** → **Structure Definition** → **Reuse Across Projects**
4. **Inspector Communication** → **Real-time Chat** → **Issue Resolution**

#### Data Relationships
- **Managers** → **Projects** → **Inspections** → **Reports**
- **Templates** → **Inspections** (structure inheritance)
- **Inspectors** → **Inspections** (assignment relationships)
- **Clients** → **Projects** (ownership and billing)
- **Chats** → **Inspections** (context-based communication)