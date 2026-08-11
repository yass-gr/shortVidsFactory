import React from 'react'
import { Clapperboard, Edit2, ArrowLeft, Plus, MoreHorizontal, Check } from 'lucide-react'
import type { AppScreen } from '../types'

interface WindowChromeProps {
  currentScreen: AppScreen
  onNavigate: (screen: AppScreen) => void
  activeProjectTitle?: string | null
  onNewProjectClick: () => void
  hasUnsavedChanges?: boolean
  onSaveProject?: () => void
  onOpenSettings?: () => void
}

const NAV_TARGETS: Partial<Record<AppScreen, string>> = {
  projects: '#/',
  upload: '#/new',
}

export const WindowChrome: React.FC<WindowChromeProps> = ({
  currentScreen,
  onNavigate,
  activeProjectTitle,
  onNewProjectClick,
  hasUnsavedChanges = false,
  onSaveProject,
  onOpenSettings,
}) => {
  return (
    <header className="h-[60px] bg-[#111316] border-b border-white/10 px-4 flex items-center justify-between select-none shrink-0 z-50">
      {/* Left: macOS Controls & Logo */}
      <div className="flex items-center gap-4">
        {/* macOS Window dots */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/20 hover:opacity-80 cursor-pointer" title="Close" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/20 hover:opacity-80 cursor-pointer" title="Minimize" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/20 hover:opacity-80 cursor-pointer" title="Maximize" />
        </div>

        {/* Brand identity */}
        <div
          className="flex items-center gap-2 cursor-pointer group pl-2"
          onClick={() => onNavigate('projects')}
        >
          <div className="w-7 h-7 rounded-lg bg-[#D5FF3F]/15 flex items-center justify-center border border-[#D5FF3F]/30 group-hover:scale-105 transition-transform">
            <Clapperboard className="w-4 h-4 text-[#D5FF3F]" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight group-hover:text-[#D5FF3F] transition-colors">
            ShortVidsFactory
          </span>
          <span className="text-[11px] text-[#707477] font-mono">v1.0.0</span>
        </div>

        {/* Screen Shortcut Bar (for easy testing & quick navigation across all 5 screens) */}
        <div className="hidden lg:flex items-center gap-1 bg-[#191C20] p-1 rounded-lg border border-white/5 ml-4 text-xs text-[#A7A9A8]">
          <button
            onClick={() => onNavigate('projects')}
            className={`px-2.5 py-1 rounded-md transition-all ${currentScreen === 'projects' ? 'bg-[#D5FF3F] text-black font-semibold shadow-sm' : 'hover:text-white hover:bg-white/5'}`}
          >
            Projects
          </button>
          <button
            onClick={() => onNavigate('upload')}
            className={`px-2.5 py-1 rounded-md transition-all ${currentScreen === 'upload' ? 'bg-[#D5FF3F] text-black font-semibold shadow-sm' : 'hover:text-white hover:bg-white/5'}`}
          >
            Upload
          </button>
          <button
            onClick={() => onNavigate('scripts')}
            className={`px-2.5 py-1 rounded-md transition-all ${currentScreen === 'scripts' ? 'bg-[#D5FF3F] text-black font-semibold shadow-sm' : 'hover:text-white hover:bg-white/5'}`}
          >
            Scripts
          </button>
          <button
            onClick={() => onNavigate('editor')}
            className={`px-2.5 py-1 rounded-md transition-all ${currentScreen === 'editor' ? 'bg-[#D5FF3F] text-black font-semibold shadow-sm' : 'hover:text-white hover:bg-white/5'}`}
          >
            Editor
          </button>
          <button
            onClick={() => onNavigate('exporting')}
            className={`px-2.5 py-1 rounded-md transition-all ${currentScreen === 'exporting' ? 'bg-[#D5FF3F] text-black font-semibold shadow-sm' : 'hover:text-white hover:bg-white/5'}`}
          >
            Exporting
          </button>
        </div>
      </div>

      {/* Center: Current Project Title */}
      {currentScreen !== 'projects' && activeProjectTitle && (
        <div className="hidden md:flex items-center gap-2 text-sm text-[#F5F5F2] font-medium bg-[#191C20] px-3 py-1.5 rounded-lg border border-white/5">
          <span>{activeProjectTitle}</span>
          <Edit2 className="w-3.5 h-3.5 text-[#707477] hover:text-[#D5FF3F] cursor-pointer transition-colors" />
        </div>
      )}

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {currentScreen === 'projects' && (
          <button
            onClick={onNewProjectClick}
            className="flex items-center gap-1.5 bg-[#FF5B63] hover:bg-[#ff7077] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg shadow-red-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New project</span>
          </button>
        )}

        {currentScreen === 'scripts' && (
          <button
            onClick={() => onNavigate('projects')}
            className="flex items-center gap-1.5 bg-[#191C20] hover:bg-[#24282D] text-[#F5F5F2] text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to projects</span>
          </button>
        )}

        {currentScreen === 'editor' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#A7A9A8]">
              {hasUnsavedChanges ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Unsaved changes</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-[#D5FF3F]" />
                  <span>Saved</span>
                </>
              )}
            </div>
            <button
              onClick={onSaveProject}
              className="bg-[#D5FF3F] hover:bg-[#E2FF70] text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-md shadow-[#D5FF3F]/10 cursor-pointer"
            >
              Save
            </button>
          </div>
        )}

        {currentScreen === 'exporting' && (
          <button
            onClick={() => onNavigate('editor')}
            className="flex items-center gap-1.5 bg-[#191C20] hover:bg-[#24282D] text-[#F5F5F2] text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to editor</span>
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-[#707477] hover:text-white hover:bg-white/5 transition-colors"
          title="More options / Settings"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

export default WindowChrome