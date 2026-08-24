import React, { useState } from 'react'
import { X, Key, Folder, Sliders, ShieldCheck, Cpu } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('svf_api_key') ?? '')
  const [exportFolder, setExportFolder] = useState(
    () => localStorage.getItem('svf_export_folder') ?? '/Users/yass/Videos/Exports',
  )
  const [defaultFont, setDefaultFont] = useState(
    () => localStorage.getItem('svf_default_font') ?? 'OpenSans',
  )
  const [hardwareAccel, setHardwareAccel] = useState(true)

  const handleSave = () => {
    localStorage.setItem('svf_api_key', apiKey)
    localStorage.setItem('svf_export_folder', exportFolder)
    localStorage.setItem('svf_default_font', defaultFont)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#14171A] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#191C20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D5FF3F]/10 border border-[#D5FF3F]/30 text-[#D5FF3F] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Settings</h3>
              <p className="text-xs text-[#707477]">Configure AI models, directories & hardware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#707477] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#A7A9A8] uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-[#D5FF3F]" />
              <span>Gemini API Key</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full bg-[#191C20] border border-white/15 focus:border-[#D5FF3F] rounded-xl px-4 py-3 text-xs text-white outline-none"
            />
            <p className="text-[11px] text-[#707477]">
              Used for video transcript analysis and automatic 15-30s script hook generation.
            </p>
          </div>

          {/* Export Directory */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#A7A9A8] uppercase tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#D5FF3F]" />
              <span>Default Export Folder</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={exportFolder}
                onChange={(e) => setExportFolder(e.target.value)}
                className="flex-1 bg-[#191C20] border border-white/15 focus:border-[#D5FF3F] rounded-xl px-4 py-3 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          {/* Subtitle Font */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#A7A9A8] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D5FF3F]" />
              <span>Default Caption Font</span>
            </label>
            <select
              value={defaultFont}
              onChange={(e) => setDefaultFont(e.target.value)}
              className="w-full bg-[#191C20] border border-white/15 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#D5FF3F]"
            >
              <option value="OpenSans">OpenSans</option>
              <option value="Arial">Arial</option>
              <option value="Roboto">Roboto</option>
              <option value="Inter">Inter</option>
            </select>
          </div>

          {/* Hardware Acceleration */}
          <div className="flex items-center justify-between p-4 bg-[#191C20] rounded-2xl border border-white/5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Cpu className="w-4 h-4 text-[#D5FF3F]" />
                <span>GPU Acceleration (H.264 / NVENC)</span>
              </div>
              <p className="text-[11px] text-[#707477]">
                Accelerate 1080x1920 video rendering using local GPU hardware.
              </p>
            </div>
            <input
              type="checkbox"
              checked={hardwareAccel}
              onChange={(e) => setHardwareAccel(e.target.checked)}
              className="w-5 h-5 accent-[#D5FF3F] cursor-pointer"
            />
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