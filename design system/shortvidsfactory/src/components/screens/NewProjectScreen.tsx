import React, { useState } from 'react';
import { 
  UploadCloud, FileVideo, CheckCircle2, ArrowRight, Lightbulb, 
  X, Sparkles, Loader2, ArrowLeft 
} from 'lucide-react';
import { AppScreen, Project } from '../../types';
import { SAMPLE_THUMBNAILS } from '../../data/initialData';

interface NewProjectScreenProps {
  onProjectCreated: (newProject: Project) => void;
  setCurrentScreen: (screen: AppScreen) => void;
}

export const NewProjectScreen: React.FC<NewProjectScreenProps> = ({
  onProjectCreated,
  setCurrentScreen,
}) => {
  const [projectName, setProjectName] = useState('Creativity Talk – Plant Edition');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    duration: string;
  } | null>({
    name: 'Creativity_Talk_Ep12.mp4',
    size: '1.24 GB',
    duration: '24:31',
  });

  const [uploadStep, setUploadStep] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentProcessText, setCurrentProcessText] = useState('Uploading video file...');

  const handleStartProcessing = () => {
    setUploadStep('processing');
    setProgressPercent(15);
    setCurrentProcessText('Uploading video file (1.24 GB)...');

    setTimeout(() => {
      setProgressPercent(45);
      setCurrentProcessText('Transcribing audio with Whisper AI...');
    }, 1200);

    setTimeout(() => {
      setProgressPercent(80);
      setCurrentProcessText('Generating 3 short video scripts with Gemini...');
    }, 2400);

    setTimeout(() => {
      setProgressPercent(100);
      setCurrentProcessText('Done! Loading scripts...');
      
      const createdProject: Project = {
        id: `proj-${Date.now()}`,
        title: projectName || 'Untitled Project',
        sourceFile: selectedFile?.name || 'video_clip.mp4',
        sourceDuration: selectedFile?.duration || '24:31',
        editedTime: 'Just now',
        status: 'Processing',
        thumbnail: SAMPLE_THUMBNAILS.plantGirl,
        aspectRatio: '9:16',
        lastEditedDate: new Date().toISOString(),
      };

      onProjectCreated(createdProject);
      setCurrentScreen('scripts');
    }, 3600);
  };

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#0D0F11] text-[#F5F5F2] overflow-hidden">
      {/* Workflow Sidebar */}
      <aside className="w-[280px] bg-[#14171A] border-r border-white/10 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div>
            <button
              onClick={() => setCurrentScreen('projects')}
              className="flex items-center gap-2 text-xs text-[#707477] hover:text-white transition-colors mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to projects</span>
            </button>
            <h2 className="text-xl font-bold text-white tracking-tight">New project</h2>
            <p className="text-xs text-[#707477] mt-1">
              Convert long videos into vertical short clips.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-6 relative before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-[2px] before:bg-white/10">
            {/* Step 1 */}
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                uploadStep === 'idle' 
                  ? 'bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20' 
                  : 'bg-[#D5FF3F] text-black'
              }`}>
                {uploadStep !== 'idle' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Upload video</h4>
                <p className="text-xs text-[#707477]">Select source MP4/MOV file</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                uploadStep === 'processing' && progressPercent >= 45
                  ? 'bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20'
                  : 'bg-[#191C20] text-[#707477] border border-white/10'
              }`}>
                2
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${uploadStep === 'processing' && progressPercent >= 45 ? 'text-white' : 'text-[#707477]'}`}>
                  Transcribing
                </h4>
                <p className="text-xs text-[#707477]">Whisper AI speech-to-text</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                uploadStep === 'processing' && progressPercent >= 80
                  ? 'bg-[#D5FF3F] text-black ring-4 ring-[#D5FF3F]/20'
                  : 'bg-[#191C20] text-[#707477] border border-white/10'
              }`}>
                3
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${uploadStep === 'processing' && progressPercent >= 80 ? 'text-white' : 'text-[#707477]'}`}>
                  Writing scripts
                </h4>
                <p className="text-xs text-[#707477]">AI is crafting short hooks</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-[#191C20] text-[#707477] border border-white/10 flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#707477]">Editor</h4>
                <p className="text-xs text-[#707477]">Pick a script to continue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-[#191C20] p-4 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D5FF3F]">
            <Lightbulb className="w-4 h-4" />
            <span>Tip</span>
          </div>
          <p className="text-xs text-[#A7A9A8] leading-relaxed">
            For best results, pick a spoken-word video like a podcast, interview, or vlog with clear speech.
          </p>
        </div>
      </aside>

      {/* Main Form Area */}
      <main className="flex-1 overflow-y-auto p-10 flex flex-col justify-center max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create a short video project</h1>
          <p className="text-sm text-[#A7A9A8] mt-1">
            Give your project a name and upload your video to generate AI scripts.
          </p>
        </div>

        {/* Form Controls */}
        <div className="space-y-6 bg-[#191C20] p-8 rounded-3xl border border-white/10">
          {/* Project Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#A7A9A8]">
              1. Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Creativity Talk – Plant Edition"
              className="w-full bg-[#111316] border border-white/15 focus:border-[#D5FF3F] rounded-xl px-4 py-3 text-sm text-white placeholder-[#707477] outline-none transition-colors"
            />
          </div>

          {/* Video Picker / Dropzone */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#A7A9A8]">
              2. Upload video file
            </label>

            {!selectedFile ? (
              <div 
                onClick={() => setSelectedFile({ name: 'Creativity_Talk_Ep12.mp4', size: '1.24 GB', duration: '24:31' })}
                className="border-2 border-dashed border-white/20 hover:border-[#D5FF3F] bg-[#111316]/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#D5FF3F]/10 border border-[#D5FF3F]/30 text-[#D5FF3F] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Drag & drop your video here or <span className="text-[#D5FF3F] underline">Browse files</span>
                  </p>
                  <p className="text-xs text-[#707477] mt-1">
                    Supports MP4, MOV, MKV, WebM • Max size 4 GB
                  </p>
                </div>
              </div>
            ) : (
              /* Selected File Card */
              <div className="bg-[#111316] p-4 rounded-2xl border border-white/15 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#D5FF3F]/10 border border-[#D5FF3F]/20 text-[#D5FF3F] flex items-center justify-center">
                    <FileVideo className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{selectedFile.name}</h4>
                    <p className="text-xs text-[#707477]">
                      {selectedFile.size} • Duration {selectedFile.duration}
                    </p>
                  </div>
                </div>

                {uploadStep === 'idle' && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 rounded-lg text-[#707477] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Processing / Progress Animation Bar */}
          {uploadStep === 'processing' && (
            <div className="bg-[#111316] p-5 rounded-2xl border border-[#D5FF3F]/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#D5FF3F] font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {currentProcessText}
                </span>
                <span className="font-mono text-[#D5FF3F] font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#24282D] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#D5FF3F] h-full transition-all duration-300 shadow-[0_0_12px_rgba(213,255,63,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              disabled={!selectedFile || uploadStep === 'processing'}
              onClick={handleStartProcessing}
              className="flex items-center gap-2 bg-[#D5FF3F] hover:bg-[#E2FF70] disabled:opacity-50 text-black text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#D5FF3F]/10 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Scripts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
