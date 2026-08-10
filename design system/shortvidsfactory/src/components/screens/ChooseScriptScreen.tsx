import React, { useState } from 'react';
import { 
  CheckCircle2, Sparkles, Bookmark, ArrowRight, RotateCw, Info, 
  Lightbulb, FileText, Clock, Scissors 
} from 'lucide-react';
import { ScriptOption, AppScreen, Project } from '../../types';
import { INITIAL_SCRIPTS, SAMPLE_THUMBNAILS } from '../../data/initialData';

interface ChooseScriptScreenProps {
  activeProject?: Project | null;
  onSelectScript: (script: ScriptOption) => void;
  setCurrentScreen: (screen: AppScreen) => void;
}

export const ChooseScriptScreen: React.FC<ChooseScriptScreenProps> = ({
  activeProject,
  onSelectScript,
  setCurrentScreen,
}) => {
  const [selectedScriptId, setSelectedScriptId] = useState<string>('script-1');
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#0D0F11] text-[#F5F5F2] overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[280px] bg-[#14171A] border-r border-white/10 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-6">
          {/* Source Video Preview Card */}
          <div className="bg-[#191C20] rounded-2xl border border-white/10 overflow-hidden">
            <div className="relative aspect-video bg-black">
              <img
                src={activeProject?.thumbnail || SAMPLE_THUMBNAILS.plantGirl}
                alt="Source video"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[11px] font-mono text-white">
                {activeProject?.sourceDuration || '24:31'}
              </div>
            </div>
            <div className="p-3 space-y-1">
              <h4 className="text-xs font-semibold text-white truncate">
                {activeProject?.title || 'Creativity Talk – Plant Edition'}
              </h4>
              <p className="text-[11px] text-[#707477] truncate">
                Source video: {activeProject?.sourceFile || 'Creativity_Talk_Ep12.mp4'}
              </p>
            </div>
          </div>

          {/* Workflow Steps Tracker */}
          <div className="space-y-4 relative before:absolute before:left-[13px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-white/10">
            {/* Step 1 */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-white">Upload</h5>
                <p className="text-[10px] text-[#707477]">Completed</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black flex items-center justify-center text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-white">Transcribing</h5>
                <p className="text-[10px] text-[#707477]">Completed (100%)</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-7 h-7 rounded-full bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20 flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[#D5FF3F]">Writing scripts</h5>
                <p className="text-[10px] text-[#A7A9A8]">AI is crafting ideas</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-7 h-7 rounded-full bg-[#191C20] text-[#707477] border border-white/10 flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[#707477]">Editor</h5>
                <p className="text-[10px] text-[#707477]">Pick a script to continue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-[#191C20] p-3.5 rounded-2xl border border-white/5 space-y-1.5 mt-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D5FF3F]">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Tip</span>
          </div>
          <p className="text-[11px] text-[#A7A9A8] leading-relaxed">
            Each script is designed for a 15–30 second short. Pick the one that fits your audience best.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Choose a script</h1>
              <p className="text-sm text-[#A7A9A8] mt-1">
                We've generated up to 3 short-video scripts. Pick the one you like best.
              </p>
            </div>

            {/* Top Right Info Notice Box */}
            <div className="hidden xl:flex items-center gap-2 bg-[#191C20] border border-white/10 px-3.5 py-2 rounded-xl text-xs text-[#A7A9A8]">
              <Info className="w-4 h-4 text-[#D5FF3F] shrink-0" />
              <span>Scripts are based on the transcript of your video and optimized for short-form engagement.</span>
            </div>
          </div>

          {/* Generated Badge */}
          <div className="inline-flex items-center gap-2 bg-[#D5FF3F]/10 border border-[#D5FF3F]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#D5FF3F]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>3 scripts generated</span>
          </div>

          {/* 3 Script Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INITIAL_SCRIPTS.map((script) => {
              const isSelected = selectedScriptId === script.id;
              const isBookmarked = bookmarkedIds[script.id];

              return (
                <div
                  key={script.id}
                  onClick={() => setSelectedScriptId(script.id)}
                  className={`bg-[#191C20] rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group relative ${
                    script.isRecommended || isSelected
                      ? 'border-[#D5FF3F] shadow-[0_0_24px_rgba(213,255,63,0.12)]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Top Bar: Number, Badge, Bookmark */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                        {script.number}
                      </span>
                      {script.isRecommended && (
                        <span className="bg-[#D5FF3F]/20 text-[#D5FF3F] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D5FF3F]/30 flex items-center gap-1">
                          ★ Recommended
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => toggleBookmark(script.id, e)}
                      className={`p-1 rounded-lg transition-colors ${
                        isBookmarked ? 'text-[#D5FF3F]' : 'text-[#707477] hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#D5FF3F]' : ''}`} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white tracking-tight leading-snug group-hover:text-[#D5FF3F] transition-colors">
                    {script.title}
                  </h3>

                  {/* Video Thumbnail Preview Frame */}
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black border border-white/10">
                    <img
                      src={script.previewThumbnail}
                      alt={script.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    
                    {/* Caption Overlay Sample */}
                    <div className="absolute inset-x-3 bottom-3 text-center">
                      <div className="bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/15 text-xs font-black tracking-wider text-white inline-block uppercase">
                        {script.captionPreview.split(' ').map((word, idx) => {
                          const isHighlighted = script.highlightedWords.some((hw) => hw.includes(word));
                          return (
                            <span
                              key={idx}
                              className={isHighlighted ? 'text-[#D5FF3F] mx-0.5' : 'mx-0.5'}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                      {script.formattedDuration}
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-[#A7A9A8] leading-relaxed line-clamp-3">
                    {script.summary}
                  </p>

                  {/* Stats Footer Bar */}
                  <div className="grid grid-cols-3 gap-1 pt-3 border-t border-white/5 text-[11px] text-[#707477]">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{script.wordsUsed} words</span>
                    </div>
                    <div className="flex items-center gap-1 justify-center">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{script.formattedDuration}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <Scissors className="w-3.5 h-3.5" />
                      <span>{script.cutCount} cut</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectScript(script);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      script.isRecommended || isSelected
                        ? 'bg-[#D5FF3F] text-black hover:bg-[#E2FF70] shadow-md shadow-[#D5FF3F]/10'
                        : 'bg-[#24282D] text-white hover:bg-white/10'
                    }`}
                  >
                    <span>Use this</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar: Regenerate */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-[#707477]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#D5FF3F]" />
            <span>You can always regenerate scripts if you want different ideas.</span>
          </div>

          <button
            onClick={() => {
              // Simulated regeneration
              alert('Regenerating new scripts with Gemini AI...');
            }}
            className="flex items-center gap-2 bg-[#191C20] hover:bg-[#24282D] text-white px-4 py-2 rounded-xl border border-white/10 transition-colors font-medium cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Regenerate scripts</span>
          </button>
        </div>
      </main>
    </div>
  );
};
