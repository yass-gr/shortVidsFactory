import React, { useEffect, useState } from 'react'
import { X, Folder, Sliders } from 'lucide-react'

export const FONTS = ['Arial', 'OpenSans', 'Roboto'] as const

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [exportFolder, setExportFolder] = useState(
    () => localStorage.getItem('svf_export_folder') ?? '',
  )
  const [defaultFont, setDefaultFont] = useState(
    () => localStorage.getItem('svf_default_font') ?? 'Arial',
  )

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleSave = () => {
    localStorage.setItem('svf_export_folder', exportFolder)
    localStorage.setItem('svf_default_font', defaultFont)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="settings-backdrop"
    >
      <div
        className="bg-[#14171A] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#191C20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D5FF3F]/10 border border-[#D5FF3F]/30 text-[#D5FF3F] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Settings</h3>
              <p className="text-xs text-[#8A8F94]">Frontend preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-xl text-[#8A8F94] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Default Export Folder */}
          <div className="space-y-2">
            <label htmlFor="svf-export-folder" className="text-xs font-semibold text-[#B4B6B5] uppercase tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#D5FF3F]" />
              <span>Default Export Folder</span>
            </label>
            <input
              id="svf-export-folder"
              type="text"
              value={exportFolder}
              onChange={(e) => setExportFolder(e.target.value)}
              placeholder="~/Videos"
              className="w-full bg-[#191C20] border border-white/15 focus:border-[#D5FF3F] rounded-xl px-4 py-3 text-xs text-white outline-none font-mono placeholder-[#8A8F94]"
            />
            <p className="text-[11px] text-[#8A8F94]">
              Relative paths are resolved under your home directory by the backend.
            </p>
          </div>

          {/* Subtitle Font */}
          <div className="space-y-2">
            <label htmlFor="svf-default-font" className="text-xs font-semibold text-[#B4B6B5] uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#D5FF3F]" />
              <span>Default Caption Font</span>
            </label>
            <select
              id="svf-default-font"
              value={defaultFont}
              onChange={(e) => setDefaultFont(e.target.value)}
              className="w-full bg-[#191C20] border border-white/15 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#D5FF3F]"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#8A8F94]">
              Used as the starting font for new editing sessions.
            </p>
          </div>

          {/* Note about server-side config */}
          <div className="p-4 bg-[#191C20] rounded-2xl border border-white/5 text-[11px] text-[#B4B6B5] leading-relaxed">
            The Gemini API key and render hardware options are configured on the
            backend via environment variables (e.g. <span className="font-mono text-white">SHORTSVIDS_GEMINI_API_KEY</span>,{' '}
            <span className="font-mono text-white">SHORTSVIDS_FONT_PATH</span>) — not here.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-white/10 bg-[#191C20] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#24282D] hover:bg-white/10 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-[#D5FF3F] hover:bg-[#E2FF70] text-xs font-bold text-black transition-all shadow-md shadow-[#D5FF3F]/10 cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
