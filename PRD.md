# C3PL Quote Calculator - Product Requirements Document

## Mission Statement
Accelerate sales cycles and ensure pricing accuracy through a fast, powerful quote calculator for C3PL logistics services.

**Experience Qualities**:
1. **Professional** - Clean, business-focused interface that instills confidence in pricing accuracy
2. **Efficient** - Lightning-fast calculations and intuitive workflows that don't slow down sales teams
3. **Precise** - Mathematical accuracy with transparent calculation breakdowns for client trust

**Complexity Level**: 
- Light Application (multiple features with basic state)
- Focused on rapid quote generation with real-time calculations, form validation, and persistent quote storage

## Essential Features

### Quote Calculator
- **Functionality**: Calculate C3PL service costs based on monthly orders, units per order, AOV, and shipping preferences
- **Purpose**: Enable sales teams to provide instant, accurate pricing to prospects
- **Trigger**: User inputs client requirements via form fields
- **Progression**: Input parameters → Real-time calculation → Quote display → Save/export options
- **Success criteria**: Calculations match specification exactly, quotes generate in <300ms

### Rate Card Management
- **Functionality**: CRUD operations for pricing models with version control
- **Purpose**: Allow administrators to update pricing without code changes
- **Trigger**: Admin accesses rate card management section
- **Progression**: Select rate card → Edit pricing → Version notes → Save new version
- **Success criteria**: New rate cards apply to future quotes, existing quotes remain version-locked

### Quote History & Export
- **Functionality**: Save, retrieve, and export quotes with PDF generation
- **Purpose**: Track client conversations and provide professional quote documents
- **Trigger**: User saves a quote or accesses quote history
- **Progression**: Save quote → View in history → Export as PDF
- **Success criteria**: Quotes persist between sessions, PDFs include all calculation details

## Edge Case Handling
- **Invalid Shipping Mix**: Auto-normalize percentages between 99.5-100.5% with user notification
- **Zero Orders**: Display minimum monthly fee as base cost
- **Extreme Values**: Validate reasonable input ranges and show warnings for unusual parameters
- **Missing Rate Cards**: Graceful fallback to default Growth Plan with notification

## Design Direction
The design should feel professional and trustworthy like enterprise financial software, with clean lines and precise typography that reinforces mathematical accuracy. Minimal interface serves the core purpose of rapid quote generation.

## Color Selection
Complementary color scheme using professional blues and warm accents to convey trust and expertise.

- **Primary Color**: Deep Navy Blue (oklch(0.25 0.08 240)) - Communicates trust and financial stability
- **Secondary Colors**: Light Blue (oklch(0.85 0.04 240)) for backgrounds and Warm Gray (oklch(0.75 0.02 60)) for secondary actions
- **Accent Color**: Warm Orange (oklch(0.65 0.15 45)) for CTAs and important highlights
- **Foreground/Background Pairings**: 
  - Background (Light Blue): Dark Navy text - Ratio 12.3:1 ✓
  - Primary (Deep Navy): White text - Ratio 8.9:1 ✓
  - Accent (Warm Orange): Black text - Ratio 4.8:1 ✓
  - Card (White): Dark Navy text - Ratio 12.3:1 ✓

## Font Selection
Professional sans-serif typography that emphasizes clarity and precision in financial calculations.

- **Typographic Hierarchy**: 
  - H1 (Quote Total): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter SemiBold/24px/normal spacing
  - H3 (Cost Breakdown): Inter Medium/18px/normal spacing
  - Body (Form Labels): Inter Regular/16px/relaxed spacing
  - Small (Helper Text): Inter Regular/14px/normal spacing

## Animations
Subtle functionality-focused animations that provide immediate feedback without distracting from financial precision.

- **Purposeful Meaning**: Smooth transitions reinforce calculation accuracy and system responsiveness
- **Hierarchy of Movement**: Real-time calculation updates receive priority animation focus, with subtle hover states on interactive elements

## Component Selection
- **Components**: Forms (multi-step calculator), Cards (quote display, rate card previews), Dialogs (rate card editor), Tables (quote history), Buttons (calculate, save, export), Select (rate card chooser), Inputs (numerical with validation)
- **Customizations**: Currency input component with automatic formatting, percentage input with validation, calculation result display with breakdown tooltips
- **States**: Loading states during calculations, success states for saved quotes, error states for invalid inputs, disabled states for incomplete forms
- **Icon Selection**: Calculator, Save, Download, Settings, Edit, History icons from Phosphor set
- **Spacing**: Consistent 16px base unit with 24px section spacing and 8px component spacing
- **Mobile**: Single-column form layout with collapsible calculation breakdown, touch-friendly input controls with improved numerical keypad support