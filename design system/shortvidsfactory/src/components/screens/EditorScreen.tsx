import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Trash2, Copy, Plus, 
  ArrowLeft, Film, Music, Type, Folder, Send, Check, Settings, 
  Sparkles, Sliders, Smartphone, HelpCircle, GripVertical
} from 'lucide-react';
import { Cut, CaptionLine, MusicTrack, AppScreen, Project } from '../../types';
import { INITIAL_CUTS, AVAILABLE_MUSIC_TRACKS } from '../../data/initialData';

interface EditorScreenProps {
  activeProject?: Project | null;
  setCurrentScreen: (screen: AppScreen) => void;
  onStartExport: (destinationPath: string) => void;
  onMarkUnsaved: (hasUnsaved: boolean) => void;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({
  activeProject,
  setCurrentScreen,
  onStartExport,
  onMarkUnsaved,
}) => {
  // State for Cuts
  const [cuts, setCuts] = useState<Cut[]>(INITIAL_CUTS);
  const [selectedCutId, setSelectedCutId] = useState<string>('cut-1');

  // Inspector Tab
  const [inspectorTab, setInspectorTab] = useState<'captions' | 'font' | 'music'>('captions');

  // Selected Font
  const [selectedFont, setSelectedFont] = useState<string>('OpenSans');

  // Selected Music
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(AVAILABLE_MUSIC_TRACKS[0]);
  const [musicVolume, setMusicVolume] = useState<number>(-16.0);
  const [duckUnderVoice, setDuckUnderVoice] = useState<boolean>(true);

  // Video Playback Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(7); // starts at 00:07 like in screenshot
  const [exportDestination, setExportDestination] = useState<string>('/Users/yass/Videos/Exports');

  const selectedCut = cuts.find((c) => c.id === selectedCutId) || cuts[0];
  const totalDurationSec = cuts.reduce((acc, c) => acc + c.duration, 0);

  // Playback Timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= totalDurationSec) {
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDurationSec]);

  // Current active caption based on currentTimeSec
  const currentCaptionLine = selectedCut?.captions.find(
    (cap) => currentTimeSec >= cap.startSec && currentTimeSec <= cap.endSec
  )?.text || 'THIS PLANT CHANGED HOW I THINK.';

  // Handlers
  const handleUpdateCaptionText = (captionId: string, newText: string) => {
    setCuts((prevCuts) =>
      prevCuts.map((cut) => {
        if (cut.id === selectedCutId) {
          return {
            ...cut,
            captions: cut.captions.map((cap) =>
              cap.id === captionId ? { ...cap, text: newText } : cap
            ),
          };
        }
        return cut;
      })
    );
    onMarkUnsaved(true);
  };

  const handleDeleteCaption = (captionId: string) => {
    setCuts((prevCuts) =>
      prevCuts.map((cut) => {
        if (cut.id === selectedCutId) {
          return {
            ...cut,
            captions: cut.captions.filter((cap) => cap.id !== captionId),
          };
        }
        return cut;
      })
    );
    onMarkUnsaved(true);
  };

  const handleAddCaption = () => {
    const nextSec = selectedCut ? selectedCut.duration - 1 : 0;
    const newCap: CaptionLine = {
      id: `cap-${Date.now()}`,
      timestamp: `00:0${Math.min(nextSec, 9)}`,
      text: 'New caption line',
      startSec: nextSec,
      endSec: nextSec + 2,
    };

    setCuts((prevCuts) =>
      prevCuts.map((cut) => {
        if (cut.id === selectedCutId) {
          return {
            ...cut,
            captions: [...cut.captions, newCap],
          };
        }
        return cut;
      })
    );
    onMarkUnsaved(true);
  };

  const handleDeleteCut = (cutId: string) => {
    if (cuts.length <= 1) return;
    setCuts((prev) => prev.filter((c) => c.id !== cutId));
    if (selectedCutId === cutId) {
      setSelectedCutId(cuts[0].id);
    }
    onMarkUnsaved(true);
  };

  const handleDuplicateCut = (cutId: string) => {
    const cutToDup = cuts.find((c) => c.id === cutId);
    if (!cutToDup) return;

    const newCut: Cut = {
      ...cutToDup,
      id: `cut-${Date.now()}`,
      cutNumber: cuts.length + 1,
      label: `Cut ${cuts.length + 1}`,
    };

    setCuts((prev) => [...prev, newCut]);
    setSelectedCutId(newCut.id);
    onMarkUnsaved(true);
  };

  const formatTimeStr = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-[#0D0F11] text-[#F5F5F2] overflow-hidden select-none">
      {/* Main 3-Panel Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL 1: Left Info & Shortcuts Sidebar (250px) */}
        <aside className="w-[250px] bg-[#14171A] border-r border-white/10 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-5">
            {/* Back Button */}
            <button
              onClick={() => setCurrentScreen('scripts')}
              className="flex items-center gap-2 text-xs text-[#707477] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to scripts</span>
            </button>

            {/* Script In Use Box */}
            <div className="bg-[#191C20] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider block">
                Script in use
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#D5FF3F] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#D5FF3F]" />
                <span>Script 1</span>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Plants Changed My Creativity 🌿
              </h4>
              <p className="text-[11px] text-[#707477]">
                00:27 • 62 words • 3 cuts
              </p>
            </div>

            {/* Video Format Info Box */}
            <div className="bg-[#191C20] p-3.5 rounded-2xl border border-white/10 space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider">
                  Aspect ratio
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Smartphone className="w-4 h-4 text-[#D5FF3F]" />
                  <span>9:16 (Vertical)</span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider">
                  Output
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Film className="w-4 h-4 text-[#D5FF3F]" />
                  <span>1080 × 1920 MP4</span>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts Box */}
            <div className="bg-[#191C20] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#707477] tracking-wider block">
                Keyboard shortcuts
              </span>
              <div className="space-y-2 text-[11px] text-[#A7A9A8]">
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    Del
                  </span>
                  <span>Delete selected cut</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    ← →
                  </span>
                  <span>Trim cut edges</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    D
                  </span>
                  <span>Duplicate cut</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    Space
                  </span>
                  <span>Play / Pause</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bg-[#24282D] text-white px-1.5 py-0.5 rounded border border-white/10 font-mono text-[10px]">
                    S
                  </span>
                  <span>Save project</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* PANEL 2: Center Stage Video Preview & Timeline */}
        <main className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0D0F11] p-4 gap-4">
          
          {/* Top Video Stage Box */}
          <div className="bg-[#14171A] rounded-2xl border border-white/10 p-4 flex flex-col flex-1 min-h-[360px] overflow-hidden relative">
            <div className="flex items-center justify-between mb-2 text-xs text-[#707477]">
              <span className="font-semibold text-white">Preview</span>
              <span className="text-[11px]">Rendered preview (540px wide) →</span>
            </div>

            {/* Vertical Video Frame Container (Center) */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <div className="relative aspect-[9/16] h-full max-h-[420px] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black group">
                <img
                  src={selectedCut.thumbnail}
                  alt="Video frame"
                  className="w-full h-full object-cover"
                />
                
                {/* Simulated Caption Overlay */}
                <div className="absolute inset-x-4 bottom-12 text-center">
                  <div className={`bg-black/85 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 text-sm font-black tracking-wider text-white uppercase inline-block font-${selectedFont.toLowerCase()}`}>
                    {currentCaptionLine.split(' ').map((word, i) => {
                      const isHighlight = ['I', 'THINK.', 'PLANT', 'CHANGED'].includes(word);
                      return (
                        <span key={i} className={isHighlight ? 'text-[#D5FF3F] mx-0.5' : 'mx-0.5'}>
                          {word}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Play overlay button on click */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center shadow-lg">
                    {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Video Playback Scrubber Controls */}
            <div className="flex items-center gap-4 bg-[#191C20] p-2.5 rounded-xl border border-white/5 mt-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-lg bg-[#D5FF3F] text-black flex items-center justify-center hover:bg-[#E2FF70] transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
              </button>

              <span className="text-xs font-mono text-white font-semibold min-w-[85px]">
                {formatTimeStr(currentTimeSec)} / {formatTimeStr(totalDurationSec)}
              </span>

              {/* Progress Slider Bar */}
              <input
                type="range"
                min={0}
                max={totalDurationSec}
                value={currentTimeSec}
                onChange={(e) => setCurrentTimeSec(Number(e.target.value))}
                className="flex-1 cursor-pointer"
              />

              <Volume2 className="w-4 h-4 text-[#A7A9A8] hover:text-white cursor-pointer" />
              <Maximize2 className="w-4 h-4 text-[#A7A9A8] hover:text-white cursor-pointer" />
            </div>
          </div>

          {/* Bottom Timeline Section */}
          <div className="bg-[#14171A] rounded-2xl border border-white/10 p-4 space-y-3">
            {/* Timeline Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Timeline</h4>
                <p className="text-[11px] text-[#707477]">
                  Drag to reorder. Drag edges to trim.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDuplicateCut(selectedCutId)}
                  className="flex items-center gap-1.5 bg-[#191C20] hover:bg-[#24282D] text-xs font-medium text-white px-3 py-1.5 rounded-xl border border-white/10 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => handleDeleteCut(selectedCutId)}
                  className="flex items-center gap-1.5 bg-transparent hover:bg-[#FF5B63]/10 text-xs font-medium text-[#FF5B63] px-3 py-1.5 rounded-xl border border-[#FF5B63]/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Time Ruler */}
            <div className="flex justify-between text-[10px] font-mono text-[#707477] px-2 border-b border-white/5 pb-1">
              <span>00:00</span>
              <span>00:05</span>
              <span>00:15</span>
              <span>00:20</span>
              <span>00:25</span>
              <span>00:30</span>
            </div>

            {/* Cut Blocks Track */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 relative">
              {/* Vertical Playhead Indicator */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-[#D5FF3F] z-30 shadow-[0_0_8px_#D5FF3F]"
                style={{ left: `${(currentTimeSec / totalDurationSec) * 90}%` }}
              >
                <div className="w-2.5 h-2.5 bg-[#D5FF3F] rotate-45 -ml-1 -mt-1 rounded-sm" />
              </div>

              {cuts.map((cut) => {
                const isSelected = selectedCutId === cut.id;
                return (
                  <div
                    key={cut.id}
                    onClick={() => setSelectedCutId(cut.id)}
                    className={`relative flex-1 min-w-[140px] h-[80px] rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-[#5D8CFF] shadow-lg shadow-[#5D8CFF]/20 ring-2 ring-[#5D8CFF]/30'
                        : 'border-white/10 hover:border-white/30 bg-[#191C20]'
                    }`}
                  >
                    <img
                      src={cut.thumbnail}
                      alt={cut.label}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                          {cut.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-white/90">
                        {cut.timeRangeFormatted}
                      </span>
                    </div>

                    {/* Edge Trim Handles */}
                    {isSelected && (
                      <>
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#5D8CFF] flex items-center justify-center cursor-ew-resize">
                          <GripVertical className="w-3 h-3 text-white" />
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#5D8CFF] flex items-center justify-center cursor-ew-resize">
                          <GripVertical className="w-3 h-3 text-white" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Add Cut Button */}
              <button
                onClick={() => handleDuplicateCut(cuts[cuts.length - 1].id)}
                className="w-[80px] h-[80px] rounded-xl border-2 border-dashed border-white/15 hover:border-[#D5FF3F] text-[#707477] hover:text-[#D5FF3F] flex flex-col items-center justify-center gap-1 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-medium">Add cut</span>
              </button>
            </div>

            {/* Audio Track */}
            {selectedMusic && (
              <div className="bg-[#191C20] p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs text-[#A7A9A8]">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#D5FF3F]" />
                  <span className="font-semibold text-white">{selectedMusic.title}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span>{musicVolume} dB</span>
                  <Settings className="w-3.5 h-3.5 text-[#707477] hover:text-white cursor-pointer" />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* PANEL 3: Right Inspector Sidebar (360px) */}
        <aside className="w-[360px] bg-[#14171A] border-l border-white/10 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-6">
            
            {/* Inspector Tabs Bar */}
            <div className="flex items-center border-b border-white/10 text-xs font-semibold">
              <button
                onClick={() => setInspectorTab('captions')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  inspectorTab === 'captions'
                    ? 'border-[#D5FF3F] text-[#D5FF3F]'
                    : 'border-transparent text-[#707477] hover:text-white'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Captions</span>
              </button>

              <button
                onClick={() => setInspectorTab('font')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  inspectorTab === 'font'
                    ? 'border-[#D5FF3F] text-[#D5FF3F]'
                    : 'border-transparent text-[#707477] hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Font</span>
              </button>

              <button
                onClick={() => setInspectorTab('music')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  inspectorTab === 'music'
                    ? 'border-[#D5FF3F] text-[#D5FF3F]'
                    : 'border-transparent text-[#707477] hover:text-white'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Music</span>
              </button>
            </div>

            {/* TAB CONTENT 1: Captions */}
            {inspectorTab === 'captions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#707477]">
                  <span>Editing <strong className="text-white">{selectedCut.label}</strong> ({selectedCut.timeRangeFormatted})</span>
                </div>

                {/* Caption Rows List */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {selectedCut.captions.map((cap) => (
                    <div
                      key={cap.id}
                      className="flex items-center gap-2 bg-[#191C20] p-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <span className="font-mono text-[10px] text-[#707477] bg-[#111316] px-2 py-1.5 rounded border border-white/5">
                        {cap.timestamp}
                      </span>
                      <input
                        type="text"
                        value={cap.text}
                        onChange={(e) => handleUpdateCaptionText(cap.id, e.target.value)}
                        className="flex-1 bg-transparent text-xs text-white outline-none border-none focus:ring-0"
                      />
                      <button
                        onClick={() => handleDeleteCaption(cap.id)}
                        className="p-1 rounded text-[#707477] hover:text-[#FF5B63] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Caption Button */}
                <button
                  onClick={handleAddCaption}
                  className="w-full py-2.5 rounded-xl bg-[#191C20] hover:bg-[#24282D] border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add caption</span>
                </button>
              </div>
            )}

            {/* TAB CONTENT 2: Font */}
            {inspectorTab === 'font' && (
              <div className="space-y-4">
                <label className="text-xs font-semibold text-[#A7A9A8] uppercase tracking-wider block">
                  Subtitle Font Family
                </label>
                <div className="space-y-2">
                  {['OpenSans', 'Arial', 'Roboto', 'Inter', 'Playfair'].map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setSelectedFont(f);
                        onMarkUnsaved(true);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                        selectedFont === f
                          ? 'border-[#D5FF3F] bg-[#D5FF3F]/10 text-white'
                          : 'border-white/10 bg-[#191C20] text-[#A7A9A8] hover:text-white'
                      }`}
                    >
                      <span>{f}</span>
                      <span className="font-bold text-sm text-[#D5FF3F]">Ag</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Music */}
            {inspectorTab === 'music' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A7A9A8] uppercase tracking-wider block">
                    Background Music Track
                  </label>
                  <select
                    value={selectedMusic?.id || ''}
                    onChange={(e) => {
                      const track = AVAILABLE_MUSIC_TRACKS.find((m) => m.id === e.target.value);
                      setSelectedMusic(track || null);
                      onMarkUnsaved(true);
                    }}
                    className="w-full bg-[#191C20] border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-[#D5FF3F]"
                  >
                    {AVAILABLE_MUSIC_TRACKS.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#191C20] text-white">
                        🎵 {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMusic && (
                  <div className="space-y-4 bg-[#191C20] p-4 rounded-2xl border border-white/5">
                    {/* Volume Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#A7A9A8]">
                          <Volume2 className="w-3.5 h-3.5" />
                          Volume
                        </span>
                        <span className="font-mono text-white text-[11px]">{musicVolume} dB</span>
                      </div>
                      <input
                        type="range"
                        min={-30}
                        max={0}
                        step={0.5}
                        value={musicVolume}
                        onChange={(e) => {
                          setMusicVolume(Number(e.target.value));
                          onMarkUnsaved(true);
                        }}
                        className="w-full cursor-pointer"
                      />
                    </div>

                    {/* Ducking Checkbox */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={duckUnderVoice}
                          onChange={(e) => {
                            setDuckUnderVoice(e.target.checked);
                            onMarkUnsaved(true);
                          }}
                          className="w-4 h-4 accent-[#D5FF3F] rounded"
                        />
                        <span>Duck under voice</span>
                      </label>
                      <HelpCircle className="w-3.5 h-3.5 text-[#707477]" />
                    </div>

                    {/* Remove Music */}
                    <button
                      onClick={() => {
                        setSelectedMusic(null);
                        onMarkUnsaved(true);
                      }}
                      className="w-full mt-2 py-2 rounded-xl border border-[#FF5B63]/40 text-[#FF5B63] hover:bg-[#FF5B63]/10 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove music</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* FOOTER BAR: Export Bar */}
      <footer className="bg-[#14171A] border-t border-white/10 p-3.5 px-6 flex items-center justify-between gap-6 shrink-0 z-40">
        {/* Left Destination Input */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <span className="text-xs font-semibold text-[#A7A9A8]">Export:</span>
          <div className="flex-1 bg-[#191C20] border border-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-white">
            <span className="font-mono truncate">{exportDestination}</span>
            <Folder className="w-4 h-4 text-[#707477] ml-2 shrink-0 cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Center Format Specs */}
        <div className="hidden md:flex items-center gap-3 text-xs text-[#A7A9A8]">
          <span className="text-[#D5FF3F] font-semibold">Ready to export</span>
          <span>•</span>
          <span className="font-mono text-white">MP4 • 1080×1920 • H.264</span>
        </div>

        {/* Right Export Button & Status */}
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-2 text-xs text-[#707477]">
            <div className="w-24 bg-[#24282D] h-1.5 rounded-full overflow-hidden">
              <div className="w-0 bg-[#D5FF3F] h-full" />
            </div>
            <span>Ready</span>
          </div>

          <button
            onClick={() => onStartExport(exportDestination)}
            className="flex items-center gap-2 bg-[#D5FF3F] hover:bg-[#E2FF70] text-black text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-[#D5FF3F]/10 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
