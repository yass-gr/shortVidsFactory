import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Loader2, ArrowLeft, FileText, Sparkles, Folder, 
  Trash2, ExternalLink, Play, Pause, ChevronUp, ChevronDown, Check, Info 
} from 'lucide-react';
import { AppScreen, Project, ExportLogItem } from '../../types';
import { INITIAL_EXPORT_LOGS, SAMPLE_THUMBNAILS } from '../../data/initialData';

interface ExportingScreenProps {
  activeProject?: Project | null;
  destinationPath: string;
  setCurrentScreen: (screen: AppScreen) => void;
}

export const ExportingScreen: React.FC<ExportingScreenProps> = ({
  activeProject,
  destinationPath = '/Users/yass/Videos/Exports',
  setCurrentScreen,
}) => {
  const [progressPercent, setProgressPercent] = useState<number>(67);
  const [exportStep, setExportStep] = useState<number>(4);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [logs, setLogs] = useState<ExportLogItem[]>(INITIAL_EXPORT_LOGS);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Auto increment progress to 100% over time
  useEffect(() => {
    if (isCompleted) return;

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          setIsCompleted(true);
          setLogs((l) =>
            l.map((item) =>
              item.status === 'in_progress' ? { ...item, status: 'completed', message: 'Export completed successfully!' } : item
            )
          );
          return 100;
        }
        return prev + 3;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isCompleted]);

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#0D0F11] text-[#F5F5F2] overflow-hidden select-none">
      
      {/* LEFT SIDEBAR: Steps & Help (260px) */}
      <aside className="w-[260px] bg-[#14171A] border-r border-white/10 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-6">
          <button
            onClick={() => setCurrentScreen('editor')}
            className="flex items-center gap-2 text-xs text-[#707477] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to editor</span>
          </button>

          <div>
            <h3 className="text-xs font-bold text-[#707477] uppercase tracking-wider">
              EXPORT STEPS
            </h3>
            
            {/* Steps Timeline */}
            <div className="space-y-4 mt-4 relative before:absolute before:left-[13px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-white/10">
              {/* Step 1 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Prepare</h4>
                  <p className="text-[10px] text-[#707477]">Cuts and assets ready</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Render video</h4>
                  <p className="text-[10px] text-[#707477]">Rendering your video</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Add music</h4>
                  <p className="text-[10px] text-[#707477]">Mixing and ducking audio</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 relative z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCompleted ? 'bg-[#D5FF3F] text-black' : 'bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : '4'}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#D5FF3F]">Export</h4>
                  <p className="text-[10px] text-[#A7A9A8]">
                    {isCompleted ? 'Finished!' : 'Finalizing your video'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[#191C20] p-4 rounded-2xl border border-white/5 space-y-3">
            <h5 className="text-xs font-bold text-white">What's happening?</h5>
            <div className="space-y-2 text-[11px] text-[#A7A9A8] leading-relaxed">
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-[#D5FF3F] shrink-0 mt-0.5" />
                <span>We're encoding your final video and audio, then saving it to your chosen folder.</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-[#D5FF3F] shrink-0 mt-0.5" />
                <span>You'll get an MP4 (1080×1920) file with burned-in captions and music.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Need Help Footer Link */}
        <div className="pt-4 border-t border-white/10">
          <a
            href="#help"
            onClick={(e) => e.preventDefault()}
            className="flex items-center justify-between text-xs text-[#707477] hover:text-white transition-colors"
          >
            <span>Need help? Read our export guide</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </aside>

      {/* MIDDLE PANEL: Export Status, Progress & Live Logs */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Main Title & File Name Pill */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Exporting your video</h1>
            <p className="text-xs text-[#A7A9A8]">
              Please don't close ShortVidsFactory while we're exporting.
            </p>

            <div className="inline-flex items-center gap-2 bg-[#191C20] border border-white/10 px-4 py-2 rounded-xl text-xs font-mono text-white">
              <FileText className="w-4 h-4 text-[#D5FF3F]" />
              <span>Creativity_Talk_Plant_Edition_Short.mp4</span>
            </div>
          </div>

          {/* Large % Metric & Progress Bar Box */}
          <div className="bg-[#191C20] p-8 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-black text-[#D5FF3F] tracking-tight">
                {progressPercent}%
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isCompleted ? 'Export complete!' : 'Exporting...'}
                </h3>
                <p className="text-xs text-[#707477]">
                  {isCompleted ? 'File saved to destination' : 'Estimated time remaining: 00:00:24'}
                </p>
              </div>
            </div>

            {/* Lime Green Animated Progress Bar */}
            <div className="w-full bg-[#24282D] h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#D5FF3F] h-full transition-all duration-300 shadow-[0_0_16px_rgba(213,255,63,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Live Log Terminal Card */}
          <div className="bg-[#191C20] rounded-2xl border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] animate-pulse" />
                <span>Live log</span>
              </div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center gap-1 text-xs text-[#707477] hover:text-white transition-colors cursor-pointer"
              >
                <span>{showLogs ? 'Show less' : 'Show log'}</span>
                {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showLogs && (
              <div className="space-y-2 font-mono text-xs text-[#A7A9A8] max-h-[180px] overflow-y-auto pt-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3">
                    <span className="text-[#707477] text-[11px]">{log.time}</span>
                    {log.status === 'completed' ? (
                      <Check className="w-3.5 h-3.5 text-[#D5FF3F]" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-[#FFB13B] animate-spin" />
                    )}
                    <span className={log.status === 'in_progress' ? 'text-white font-semibold' : ''}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Encouragement Card */}
          <div className="bg-[#191C20] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#8E6BFF]/20 text-[#8E6BFF] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Almost there!</h4>
              <p className="text-xs text-[#A7A9A8]">
                Your short video will be saved to the destination folder when export is complete.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT PANEL: Video Preview & Export Settings (320px) */}
      <aside className="w-[320px] bg-[#14171A] border-l border-white/10 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-5">
          <h4 className="text-xs font-bold text-white">Preview</h4>

          {/* 9:16 Preview Card */}
          <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl max-h-[260px] mx-auto">
            <img
              src={SAMPLE_THUMBNAILS.plantGirl}
              alt="Export video preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Caption Overlay */}
            <div className="absolute inset-x-3 bottom-8 text-center">
              <div className="bg-black/85 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider text-white uppercase inline-block border border-white/10">
                THIS PLANT <span className="text-[#D5FF3F]">CHANGED HOW I THINK.</span>
              </div>
            </div>

            {/* Scrubber Controls */}
            <div className="absolute bottom-2 inset-x-2 flex items-center gap-2 bg-black/60 px-2 py-1 rounded-md text-[10px] font-mono text-white">
              <button onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
              </button>
              <span>00:07 / 00:27</span>
            </div>
          </div>

          {/* Export Settings Summary */}
          <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
            <h5 className="font-bold text-white">Export settings</h5>
            <div className="space-y-1.5 text-[#A7A9A8]">
              <div className="flex justify-between">
                <span>Resolution</span>
                <span className="font-mono text-white">1080 × 1920 (9:16)</span>
              </div>
              <div className="flex justify-between">
                <span>Format</span>
                <span className="font-mono text-white">MP4</span>
              </div>
              <div className="flex justify-between">
                <span>Codec</span>
                <span className="font-mono text-white">H.264</span>
              </div>
              <div className="flex justify-between">
                <span>FPS</span>
                <span className="font-mono text-white">30</span>
              </div>
              <div className="flex justify-between">
                <span>Audio</span>
                <span className="font-mono text-white">AAC, 48kHz</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated size</span>
                <span className="font-mono text-white">82.4 MB</span>
              </div>
            </div>
          </div>

          {/* Destination Path */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <label className="text-[10px] font-bold text-[#707477] uppercase tracking-wider block">
              Destination
            </label>
            <div className="bg-[#191C20] p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs text-white">
              <span className="font-mono text-[11px] truncate">{destinationPath}</span>
              <Folder className="w-4 h-4 text-[#707477] shrink-0" />
            </div>
          </div>

          {/* Status Action Cards at bottom */}
          <div className="space-y-3 pt-2">
            {!isCompleted ? (
              <div className="bg-[#191C20] p-4 rounded-2xl border border-[#D5FF3F] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D5FF3F]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting... {progressPercent}%</span>
                </div>
                <p className="text-[11px] text-[#A7A9A8]">
                  You'll be notified when it's done.
                </p>
                <button
                  onClick={() => setCurrentScreen('editor')}
                  className="w-full py-2 rounded-xl border border-[#FF5B63]/40 text-[#FF5B63] hover:bg-[#FF5B63]/10 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancel export</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#191C20] p-4 rounded-2xl border border-[#D5FF3F] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D5FF3F]">
                  <CheckCircle2 className="w-4 h-4 text-[#D5FF3F]" />
                  <span>On success</span>
                </div>
                <p className="text-[11px] text-[#A7A9A8]">
                  Open folder and reveal the exported file.
                </p>
                <button
                  onClick={() => alert(`Revealing file in OS folder: ${destinationPath}/Creativity_Talk_Plant_Edition_Short.mp4`)}
                  className="w-full py-2.5 rounded-xl bg-[#D5FF3F] hover:bg-[#E2FF70] text-black text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#D5FF3F]/10 cursor-pointer"
                >
                  <Folder className="w-4 h-4" />
                  <span>Open folder</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
