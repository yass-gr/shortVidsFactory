export type AppScreen = 'projects' | 'upload' | 'scripts' | 'editor' | 'exporting';

export type ProjectStatus = 'Ready' | 'Processing' | 'Draft';

export interface Project {
  id: string;
  title: string;
  sourceFile: string;
  sourceDuration: string; // e.g. "24:31"
  editedTime: string; // e.g. "2h ago"
  status: ProjectStatus;
  thumbnail: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  lastEditedDate: string;
  selectedScriptId?: string;
  snapshot?: ProjectSnapshot;
}

export interface ScriptOption {
  id: string;
  number: number;
  isRecommended?: boolean;
  title: string;
  hookText: string;
  previewThumbnail: string;
  summary: string;
  wordsUsed: number;
  durationSeconds: number; // e.g. 27
  formattedDuration: string; // "00:27"
  cutCount: number;
  captionPreview: string; // e.g. "THIS PLANT CHANGED HOW I THINK."
  highlightedWords: string[]; // e.g. ["I THINK."]
}

export interface CaptionLine {
  id: string;
  timestamp: string; // e.g. "00:00"
  text: string;
  startSec: number;
  endSec: number;
}

export interface Cut {
  id: string;
  cutNumber: number;
  label: string; // "Cut 1"
  thumbnail: string;
  sourceStart: number; // seconds
  sourceEnd: number; // seconds
  duration: number; // seconds
  timeRangeFormatted: string; // "00:00 – 00:09 (9s)"
  captions: CaptionLine[];
}

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  volume: number; // dB e.g. -16.0
  ducking: boolean;
}

export interface ProjectSnapshot {
  cuts: Cut[];
  music?: MusicTrack | null;
  font: 'Arial' | 'OpenSans' | 'Roboto' | 'Inter' | 'Playfair';
  exportPath: string;
  savedAt: string;
}

export interface ExportProgressState {
  isExporting: boolean;
  progressPercent: number; // 0 to 100
  timeRemainingSec: number;
  currentStep: number; // 1 to 4
  logs: ExportLogItem[];
  destinationPath: string;
  isSuccess: boolean;
  isError: boolean;
  errorMessage?: string;
}

export interface ExportLogItem {
  id: string;
  time: string; // "10:42:11"
  message: string;
  status: 'completed' | 'in_progress' | 'pending';
}
