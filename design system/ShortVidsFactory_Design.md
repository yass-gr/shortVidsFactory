# ShortVidsFactory — Design System & UI Specification

> Detailed design specification for the five-screen ShortVidsFactory desktop application.
>
> Product type: local-first AI video editing tool  
> Primary output: 9:16 vertical short-form videos  
> Platform: desktop application  
> Visual direction: premium dark creative software, inspired by modern video/design editors

---

## 1. Product Overview

ShortVidsFactory turns long-form spoken-word video such as podcasts, interviews, and vlogs into polished short-form videos.

The workflow is intentionally linear:

```text
Projects
   ↓
New Project / Upload
   ↓
AI Processing
   ↓
Choose Script
   ↓
Editor
   ↓
Export
```

The interface should make the user feel that the application is doing the difficult work while still giving them precise control over the final edit.

### Core UX principles

1. **Fast path to a finished short**
   - The user should always know what the next action is.
   - Avoid unnecessary configuration before AI processing.

2. **Visual-first**
   - Video thumbnails and the vertical preview are primary UI elements.
   - Text should support the media rather than dominate it.

3. **Professional but approachable**
   - The application should feel like a lightweight professional editor rather than a complex NLE.

4. **Clear state communication**
   - Uploading, transcribing, generating, editing, and exporting must have visually distinct states.

5. **Local-app feeling**
   - Use desktop conventions such as macOS window controls, filesystem paths, local storage information, and OS folder actions.

---

# 2. Visual Identity

## 2.1 Overall aesthetic

The design uses:

- Near-black backgrounds
- Charcoal surfaces
- Subtle borders
- Large rounded cards
- Soft shadows
- Lime/yellow-green as the primary action color
- Coral/red as a secondary attention color
- Purple/blue for AI-related accents
- High-contrast white typography
- Minimal gradients
- Thin-line icons

The application should feel similar to a modern creative tool such as a lightweight combination of:

- video editor
- design tool
- AI workspace
- desktop productivity application

It should **not** look like a generic SaaS dashboard.

---

# 3. Color System

Use semantic color tokens rather than hard-coded colors throughout the application.

## Backgrounds

```text
--bg-app:          #0D0F11
--bg-window:       #111316
--bg-sidebar:      #14171A
--bg-surface:      #191C20
--bg-surface-2:    #1E2227
--bg-surface-3:    #24282D
```

## Borders

```text
--border-subtle:   rgba(255,255,255,0.07)
--border-default:  rgba(255,255,255,0.11)
--border-strong:   rgba(255,255,255,0.18)
```

## Text

```text
--text-primary:    #F5F5F2
--text-secondary:  #A7A9A8
--text-muted:      #707477
--text-disabled:   #4D5154
```

## Primary accent

The main brand/action color is a vivid yellow-green.

```text
--accent:          #D5FF3F
--accent-hover:    #E2FF70
--accent-muted:    rgba(213,255,63,0.14)
--accent-border:   rgba(213,255,63,0.45)
```

Use the accent for:

- primary buttons
- selected timeline cuts
- active workflow steps
- progress indicators
- important status indicators
- focus rings
- AI highlights

Do not use it for large page backgrounds.

## Secondary accents

```text
--coral:           #FF5B63
--coral-muted:     rgba(255,91,99,0.12)

--purple:          #8E6BFF
--purple-muted:    rgba(142,107,255,0.13)

--blue:            #5D8CFF
--blue-muted:      rgba(93,140,255,0.12)

--orange:          #FFB13B
--orange-muted:    rgba(255,177,59,0.12)
```

### Semantic usage

| Color | Meaning |
|---|---|
| Lime | Primary action / active / success |
| Coral | Delete / cancel / destructive |
| Orange | Processing / warning |
| Purple | AI / generation |
| Blue | Selection / editor interaction |
| Grey | Inactive / neutral |

---

# 4. Typography

Use a modern sans-serif.

Preferred stack:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Alternative acceptable fonts:

- Geist
- Inter
- SF Pro
- Open Sans

## Type scale

```text
Display:       40–48px / 1.05 / 700
H1:            32–38px / 1.1 / 700
H2:            24–28px / 1.15 / 650
H3:            18–20px / 1.25 / 600
Body:          14–16px / 1.5 / 400
Small:         12–13px / 1.4 / 400
Micro:         10–11px / 1.3 / 500
```

Large headings should have tight letter spacing:

```text
letter-spacing: -0.03em
```

Buttons and labels use slightly tighter typography.

---

# 5. Spacing System

Use a 4px base grid.

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
80px
```

Recommended page padding:

```text
Desktop: 32–48px
Editor: 16–24px
Cards: 20–24px
```

---

# 6. Radius System

The design uses generous rounded corners.

```text
--radius-xs:      6px
--radius-sm:      8px
--radius-md:      12px
--radius-lg:      16px
--radius-xl:      20px
--radius-2xl:     24px
```

Recommended:

- buttons: 10–12px
- inputs: 10–12px
- cards: 16px
- large panels: 16–20px
- modal/dialog: 20px

---

# 7. Shadows

Keep shadows subtle because the interface is already dark.

```text
--shadow-sm:
0 4px 16px rgba(0,0,0,.20);

--shadow-md:
0 12px 32px rgba(0,0,0,.28);

--shadow-lg:
0 24px 64px rgba(0,0,0,.40);
```

Avoid excessive glowing effects.

Accent glow should only be used around active states:

```text
0 0 24px rgba(213,255,63,.10)
```

---

# 8. Window / Application Chrome

The application is presented as a desktop window.

## Window

```text
background: #111316
border: 1px solid rgba(255,255,255,.08)
border-radius: 18–22px
overflow: hidden
```

The top bar is approximately 64–72px high.

### macOS controls

Top-left:

```text
● red
● yellow
● green
```

Use approximately:

```text
12px diameter
8px gap
```

Do not make these controls visually dominant.

### Application identity

Next to the controls:

```text
[clapperboard icon] ShortVidsFactory   v1.0.0
```

The clapperboard icon uses the lime accent.

---

# 9. Iconography

Use a consistent outline icon set.

Recommended:

- Lucide
- Phosphor
- Radix Icons

Icons should generally be:

```text
16px
18px
20px
24px
```

Use 1.5–2px strokes.

Icons should never mix filled and outline styles randomly.

---

# 10. Buttons

## Primary

Used for the most important action.

```text
background: var(--accent)
color: #111
border: none
font-weight: 600
```

Example:

```text
+ Create new project
Use this →
Save
Export
```

Hover:

- slightly brighter
- subtle upward/brightness effect

## Secondary

Dark surface with a border.

```text
background: #202328
border: 1px solid var(--border-default)
color: var(--text-primary)
```

## Destructive

Use coral/red.

```text
background: transparent
border: 1px solid rgba(255,91,99,.45)
color: #FF686F
```

Used for:

- Delete
- Remove music
- Cancel export
- Cancel project

---

# 11. Inputs

Inputs should look like native creative-software controls rather than web forms.

```text
background: #191C20
border: 1px solid rgba(255,255,255,.10)
border-radius: 10px
height: 42–48px
padding: 0 14px
```

Focus:

```text
border-color: var(--accent)
box-shadow: 0 0 0 3px rgba(213,255,63,.08)
```

Placeholder:

```text
color: var(--text-muted)
```

---

# 12. Project Home — Page 1

## Purpose

The Projects page is the user's home base.

It should immediately answer:

- What projects exist?
- Which project was edited recently?
- Which projects are ready?
- How do I start a new one?

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ App chrome                                  New project  ⋯   │
├───────────────┬──────────────────────────────────────────────┤
│               │ Projects                                     │
│ Projects      │ Pick up where you left off...               │
│               │                                              │
│ + New project │ [Card] [Card] [Card]                         │
│               │                                              │
│ Settings      │ [Card] [Card] [New Project]                  │
│               │                                              │
│ User          │                                              │
│ Storage       │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

## Sidebar

Width:

```text
250–280px
```

Items:

- Projects
- New project
- Settings

Active item uses a subtle tinted background and lime icon.

Bottom:

- user/workspace card
- storage indicator

## Header

Title:

```text
Projects
```

Subtitle:

```text
Pick up where you left off or start a new project.
```

Right side:

- grid/list toggle
- sort dropdown
- New project button

## Project cards

Recommended dimensions:

```text
320–360px wide
300px approximately high
```

Card structure:

```text
thumbnail
↓
project name
↓
edited time
↓
status + Continue
```

Thumbnail:

```text
aspect ratio: 16:9
border-radius: 12px 12px 0 0
```

Duration badge appears over the thumbnail.

Status examples:

```text
● Ready
◌ Processing
○ Draft
```

## Empty state

If there are no projects:

```text
No projects yet.

Create your first short from a video.

[ + New project ]
```

---

# 13. New Project / Upload — Page 2

## Purpose

Make uploading feel like the beginning of an automated workflow.

## Layout

Two-column structure:

```text
┌───────────────┬──────────────────────────────────────────────┐
│ New project   │ 1. Project name                             │
│               │ [____________________________]              │
│ ① Upload      │                                              │
│ ② Transcribe  │ 2. Upload video                             │
│ ③ Scripts     │                                              │
│ ④ Done        │ ┌──────────────────────────────────────────┐ │
│               │ │                                          │ │
│ Tips          │ │       Drag & drop your video here       │ │
│               │ │              or Browse files             │ │
└───────────────┴──────────────────────────────────────────────┘
```

## Workflow sidebar

The four steps:

1. Upload video
2. Transcribing
3. Writing scripts
4. Done

Each step has:

- number/status icon
- title
- short description

Active step is lime.

Completed steps use a checkmark.

Pending steps are muted.

## Dropzone

Large dashed rectangle.

```text
height: 230–260px
border: 1px dashed rgba(255,255,255,.25)
border-radius: 16px
```

Center:

```text
cloud upload icon

Drag & drop your video here

or

[ Browse files ]

MP4, MOV, MKV, WebM · Max file size: 4 GB
```

## Selected file

Display:

- thumbnail
- filename
- file size
- duration
- remove button

Example:

```text
[thumbnail] Creativity_Talk_Ep12.mp4
            1.24 GB · 45:27                         ×
```

## Processing component

Use a horizontal step tracker:

```text
Uploading ───── Transcribing ───── Writing scripts ───── Done
```

The current step should animate subtly.

Do not use a distracting loading spinner everywhere.

---

# 14. Scripts — Page 3

## Purpose

Let AI generate several content angles and let the user choose the strongest one.

## Header

```text
Choose a script

We've generated up to 3 short-video scripts.
Pick the one you like best.
```

Show:

```text
✨ 3 scripts generated
```

## Script cards

Three cards in a row on large screens.

Each card includes:

1. index
2. recommended badge
3. bookmark
4. hook
5. visual preview
6. summary
7. metadata
8. CTA

Example:

```text
①  ★ Recommended

Plants Changed My
Creativity 🌱

[ VIDEO THUMBNAIL ]

A personal story about...

62 words       00:27       1 cut

[ Use this → ]
```

## Recommended card

The strongest AI recommendation should have:

- lime border
- subtle lime glow
- filled primary CTA
- `Recommended` badge

Other cards use neutral borders and secondary buttons.

## Card hierarchy

The hook is the most important text.

Use:

```text
22–26px
font-weight: 650–700
```

Summary:

```text
14–15px
color: secondary
```

Metadata:

```text
12px
muted
```

## Bottom action

```text
You can always regenerate scripts if you want different ideas.

[ ↻ Regenerate scripts ]
```

---

# 15. Editor — Page 4

The editor is the most important screen.

It should feel like a professional video editor while remaining significantly simpler than Premiere or DaVinci Resolve.

## Main layout

Use a three-region structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ App chrome / project name                         Save       │
├───────────┬──────────────────────────────┬───────────────────┤
│ Project   │                              │ Inspector         │
│ info      │         Preview              │                   │
│           │                              │ Captions          │
│ Settings  │                              │ Font              │
│           │                              │ Music             │
│ Shortcuts │                              │                   │
├───────────┴──────────────────────────────┴───────────────────┤
│ Timeline                                                     │
├──────────────────────────────────────────────────────────────┤
│ Export bar                                                   │
└──────────────────────────────────────────────────────────────┘
```

Recommended widths:

```text
Left sidebar:     240–260px
Center:           flexible
Inspector:        360–400px
```

## Preview

Center the vertical video.

Aspect ratio:

```text
9:16
```

Example visual dimensions:

```text
360 × 640
400 × 711
```

Never make the preview appear like a normal landscape video.

Use a dark preview stage around it.

### Caption overlay

Captions appear near the bottom center.

Recommended style:

```text
large bold white text
dark semi-transparent rounded background
optional lime-highlighted keyword
```

Example:

```text
THIS PLANT
CHANGED HOW
I THINK.
```

Captions must feel like final exported captions, not editor annotations.

## Playback controls

Below preview:

```text
Play/Pause
00:07 / 00:27
────────●────────
Volume
Fullscreen
```

Scrubbing should be smooth.

---

# 16. Timeline

The timeline should be visually clear and compact.

Header:

```text
Timeline

Drag to reorder. Drag edges to trim.

[Duplicate] [Delete]
```

## Timeline scale

Show time marks:

```text
00:00
00:05
00:10
00:15
00:20
00:25
```

## Cut blocks

Each block contains:

- thumbnail
- cut number
- start/end
- duration
- trim handles

Example:

```text
┌────────────────────┐
│ [thumb]  Cut 1     │
│          00:00–00:09│
└────────────────────┘
```

Width is proportional to duration.

## Selected cut

Selected state:

```text
border: 1–2px solid blue/lime
```

Use a stronger outline rather than changing the whole card color.

## Trim handles

Small vertical handles appear at the left/right edges.

Cursor:

```text
ew-resize
```

## Drag reorder

When dragging:

- show insertion indicator
- slightly elevate dragged block
- use a subtle shadow
- animate surrounding blocks

---

# 17. Inspector

The inspector is a fixed right sidebar.

Tabs:

```text
Captions     Font     Music
```

Active tab:

- lime icon
- lime underline
- brighter text

## Captions

Show:

```text
Editing Cut 1 (00:00 – 00:09)
```

Caption rows:

```text
[00:00] [ I used to think creativity... ] [trash]
[00:02] [ only came from big ideas.   ] [trash]
[00:04] [ But this plant on my desk  ] [trash]
```

Each row should have:

- timestamp
- editable text
- delete icon

Bottom:

```text
[ + Add caption ]
```

Captions are generated from the transcript and should normally match the spoken words.

## Font

Dropdown:

```text
OpenSans                         Ag
```

Available:

- Arial
- OpenSans
- Roboto

## Music

Dropdown:

```text
♫ Lo-Fi Plants – Evening Walk    ×
```

When selected:

### Volume

Slider:

```text
[ speaker ] ─────────●──────  -16.0 dB
```

### Ducking

```text
☑ Duck under voice
```

### Remove

```text
[ 🗑 Remove music ]
```

Use destructive styling.

---

# 18. Save State

Top-right of editor:

```text
Unsaved changes ●

[ Save ]
```

When saved:

```text
Saved ✓
```

Do not make the user wonder whether their changes were persisted.

Keyboard shortcut:

```text
S = Save project
```

---

# 19. Export Bar

The export bar is persistent at the bottom of the editor.

Structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Export                                                       │
│ [ /Users/.../Exports        📁 ]   Ready to export   [Export]│
│                                              ─────── 0%      │
└──────────────────────────────────────────────────────────────┘
```

Display output information:

```text
MP4 · 1080×1920 · H.264
```

Export button is disabled when:

```text
cuts.length === 0
```

---

# 20. Export — Page 5

The export screen is a dedicated progress experience.

## Layout

Three regions:

```text
┌─────────────┬───────────────────────────┬────────────────────┐
│ Export      │ Exporting your video      │ Preview            │
│ Steps       │                           │                    │
│             │ 67%                       │ 9:16 video         │
│ ✓ Prepare   │ ████████████░░░░          │                    │
│ ✓ Render    │                           │                    │
│ ✓ Music     │ Live log                  │ Export settings    │
│ 4 Export    │                           │ Destination        │
└─────────────┴───────────────────────────┴────────────────────┘
```

## Export steps

```text
✓ Prepare
✓ Render video
✓ Add music
4 Export
```

The active step is lime.

## Progress

Large percentage:

```text
67%
```

Supporting text:

```text
Exporting...
Estimated time remaining: 00:24
```

Progress bar:

```text
height: 8–10px
radius: 999px
```

Use lime.

## Live log

Show meaningful technical steps:

```text
✓ Preparing assets
✓ Rendering video (1080 × 1920)
✓ Encoding video (H.264)
✓ Mixing audio
✓ Applying ducking under voice
○ Finalizing export...
```

This reassures users that the process is actually progressing.

## Preview

Show the final vertical video.

Keep playback controls minimal:

```text
Play
00:07 / 00:27
scrubber
```

## Export settings

Display read-only settings:

```text
Resolution       1080 × 1920 (9:16)
Format           MP4
Codec            H.264
FPS              30
Audio            AAC, 48kHz
Estimated size   82.4 MB
```

## Destination

Filesystem field:

```text
/Users/yass/Videos/Exports       📁
```

## Success state

After completion, transform the export card into:

```text
✓ Export complete

Your short video is ready.

[ Open folder ]
```

The success state should use the lime accent.

---

# 21. Loading States

Loading should communicate the operation currently happening.

## Projects loading

Use skeleton cards.

Do not show a giant spinner.

## Scripts loading

Show:

```text
Generating your scripts...

Analyzing transcript
Finding strong hooks
Building short-form structures
```

Use subtle animated AI iconography.

## Preview loading

Use a dark preview skeleton with a small progress indicator.

## Export loading

Use the dedicated progress interface.

---

# 22. Error States

Errors should be calm and actionable.

Example:

```text
Something went wrong

We couldn't process this video.

[ Retry ]
```

Never display raw stack traces in the primary interface.

For technical errors, provide:

```text
Details ▾
```

which can reveal the underlying error.

---

# 23. Empty States

Every collection needs a designed empty state.

Example Projects:

```text
No projects yet

Turn your first podcast, interview, or vlog
into a short video.

[ + Create your first project ]
```

Editor:

```text
No cuts yet

Choose a script to start editing.
```

Inspector:

```text
Select a cut to edit captions.
```

Music:

```text
No music selected
```

---

# 24. Animation

Animations should be subtle and fast.

Recommended:

```text
Fast:      120ms
Normal:    180ms
Comfort:   240ms
Large:     320ms
```

Use:

```css
transition:
  background-color 180ms ease,
  border-color 180ms ease,
  transform 180ms ease,
  opacity 180ms ease;
```

## Hover

Cards:

```text
transform: translateY(-1px)
```

Buttons:

```text
brightness slightly increases
```

## Page transitions

Use subtle fade/slide:

```text
opacity: 0 → 1
translateY: 4px → 0
```

Do not use exaggerated motion.

---

# 25. AI Visual Language

AI-related actions should have a recognizable identity.

Use:

- sparkle icon
- purple/lime combination
- subtle glow
- short explanatory text

Examples:

```text
✨ Generating scripts
✨ AI recommendation
✨ Analyzing transcript
```

AI should feel helpful, not gimmicky.

Avoid excessive animated gradients.

---

# 26. Video Thumbnail Rules

Every thumbnail should:

- preserve the original aspect ratio
- use object-fit: cover
- have rounded corners
- avoid excessive overlays
- display duration in the bottom-right

Duration badge:

```text
background: rgba(0,0,0,.70)
padding: 4px 7px
border-radius: 6px
font-size: 11px
```

---

# 27. Responsive Behavior

Primary target is desktop.

Minimum supported editor width:

```text
1280px
```

Recommended:

```text
1440px+
```

At smaller widths:

1. Reduce sidebar width.
2. Reduce inspector width.
3. Reduce preview size.
4. Keep timeline usable.
5. Never let critical controls disappear.

The editor should not become a mobile layout.

If mobile support is eventually required, it should be a separate responsive design rather than simply shrinking the desktop editor.

---

# 28. Accessibility

## Contrast

All primary text should meet WCAG AA contrast requirements.

## Keyboard

Required shortcuts:

```text
Space    Play / Pause
Delete   Delete selected cut
← →      Trim cut edges
D        Duplicate cut
S        Save
```

## Focus

All interactive elements need visible focus states.

Primary focus:

```text
0 0 0 3px rgba(213,255,63,.16)
```

## Tooltips

Use tooltips for icon-only controls:

- delete
- duplicate
- fullscreen
- bookmark
- remove
- settings

---

# 29. Component Architecture

Recommended component structure:

```text
AppShell
├── WindowChrome
├── Sidebar
├── TopBar
└── PageContent
```

### Shared components

```text
Button
IconButton
Input
Select
Dropdown
Badge
StatusBadge
ProgressBar
Modal
Tooltip
Card
Thumbnail
EmptyState
Skeleton
Toast
Tabs
Slider
Checkbox
```

### Project components

```text
ProjectCard
ProjectGrid
ProjectSidebar
StorageIndicator
```

### Upload components

```text
UploadDropzone
FilePreview
ProcessingSteps
UploadProgress
```

### Script components

```text
ScriptCard
ScriptGrid
RecommendedBadge
ScriptMetadata
```

### Editor components

```text
VideoPreview
PlaybackControls
Timeline
TimelineRuler
CutBlock
TrimHandle
CaptionEditor
FontSelector
MusicSelector
VolumeSlider
ExportBar
```

### Export components

```text
ExportSteps
ExportProgress
ExportLog
ExportPreview
ExportSettings
DestinationPicker
ExportSuccess
```

---

# 30. State Model

The UI should explicitly support these states.

## Projects

```text
loading
error
empty
loaded
```

## Upload

```text
idle
uploading
processing
error
done
```

## Scripts

```text
loading
loaded
error
```

## Editor

```text
loading
ready
saving
saved
unsaved
error
```

## Export

```text
idle
preparing
rendering
mixing
encoding
finalizing
success
error
```

---

# 31. Important Interaction Rules

## Project card

Clicking the card:

```text
Continue → resume current workflow
```

## Script

Clicking:

```text
Use this → approve script → open Editor
```

## Timeline

Clicking a cut:

```text
select cut
update inspector
update preview
```

## Trim

Dragging edge:

```text
update source_start/source_end
re-render preview
update timeline duration
```

## Caption

Editing caption:

```text
update caption text
persist locally
refresh preview
```

## Music

Changing:

```text
track
volume
ducking
```

should update the current snapshot.

## Save

Save should persist:

```text
cuts
music
font
export_path
```

---

# 32. Data-to-UI Mapping

## Project

Display:

```text
name
thumbnail
duration
last_edited
status
```

## Script

Display:

```text
hook
summary
words_used
duration
cut_count
recommended
```

## Cut

Display:

```text
cut_number
thumbnail
source_start
source_end
duration
selected
```

## Caption

Display:

```text
start
end
text
```

## Music

Display:

```text
track
volume
ducking
```

## Snapshot

Controls:

```text
cuts
music
font
export_path
```

---

# 33. Design Tokens Summary

```css
:root {
  --bg-app: #0D0F11;
  --bg-window: #111316;
  --bg-sidebar: #14171A;

  --surface-1: #191C20;
  --surface-2: #1E2227;
  --surface-3: #24282D;

  --border: rgba(255,255,255,.10);
  --border-strong: rgba(255,255,255,.18);

  --text: #F5F5F2;
  --text-secondary: #A7A9A8;
  --text-muted: #707477;

  --accent: #D5FF3F;
  --accent-hover: #E2FF70;

  --danger: #FF5B63;
  --warning: #FFB13B;
  --purple: #8E6BFF;
  --blue: #5D8CFF;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  --shadow-sm: 0 4px 16px rgba(0,0,0,.20);
  --shadow-md: 0 12px 32px rgba(0,0,0,.28);

  --transition-fast: 120ms;
  --transition-normal: 180ms;
  --transition-slow: 240ms;
}
```

---

# 34. Final Design Direction

ShortVidsFactory should look like a **serious desktop creative application**, not an ordinary web dashboard.

The strongest visual characteristics are:

- dark cinematic workspace
- lime primary accent
- large media thumbnails
- rounded charcoal panels
- minimal borders
- strong typography
- vertical video preview
- compact professional timeline
- clear inspector controls
- visible processing stages
- highly readable export progress
- restrained animation
- consistent iconography

The most important screen is the **Editor**. Pages 1–3 should progressively lead the user toward it, while Page 5 should make exporting feel reliable and transparent.

The complete visual hierarchy should communicate:

```text
IMPORT
  ↓
AI UNDERSTANDS
  ↓
CHOOSE THE BEST IDEA
  ↓
EDIT QUICKLY
  ↓
EXPORT
```

The application should always make the next action obvious while keeping advanced controls available when the user needs them.
