import React, { useState } from 'react';
import { 
  Folder, Plus, Settings, LayoutGrid, List, ChevronDown, CheckCircle2, 
  Clock, ArrowRight, HardDrive, Sparkles 
} from 'lucide-react';
import { Project, AppScreen } from '../../types';

interface ProjectsScreenProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNewProjectClick: () => void;
  onOpenSettings: () => void;
  setCurrentScreen: (screen: AppScreen) => void;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  projects,
  onSelectProject,
  onNewProjectClick,
  onOpenSettings,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<string>('Last edited');

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#0D0F11] text-[#F5F5F2] overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[260px] bg-[#14171A] border-r border-white/10 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Nav Items */}
          <nav className="space-y-1.5">
            <button
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#24282D] text-[#D5FF3F] font-semibold text-sm border border-[#D5FF3F]/30 shadow-sm"
            >
              <Folder className="w-4 h-4 fill-[#D5FF3F]/20 text-[#D5FF3F]" />
              <span>Projects</span>
            </button>

            <button
              onClick={onNewProjectClick}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#A7A9A8] hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-4 h-4" />
                <span>New project</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-[#707477]">+</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#A7A9A8] hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User & Storage Footer */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          {/* Profile Badge */}
          <div className="flex items-center gap-3 bg-[#191C20] p-3 rounded-xl border border-white/5">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover border border-white/20"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white truncate">yass-gr</span>
                <span className="text-[10px] bg-[#D5FF3F]/20 text-[#D5FF3F] px-1.5 py-0.5 rounded font-bold">Pro</span>
              </div>
              <p className="text-[11px] text-[#707477] truncate">Local workspace</p>
            </div>
          </div>

          {/* Storage Meter */}
          <div className="bg-[#191C20] p-3 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#A7A9A8]">
                <HardDrive className="w-3.5 h-3.5" />
                Storage
              </span>
              <span className="text-[#F5F5F2] font-mono text-[11px]">120 GB free</span>
            </div>
            <div className="w-full bg-[#24282D] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#D5FF3F] h-full w-[35%]" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
            <p className="text-sm text-[#A7A9A8] mt-1">
              Pick up where you left off or start a new project.
            </p>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#191C20] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#24282D] text-[#D5FF3F]' : 'text-[#707477] hover:text-white'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#24282D] text-[#D5FF3F]' : 'text-[#707477] hover:text-white'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button className="flex items-center gap-2 bg-[#191C20] text-xs font-medium text-[#F5F5F2] px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                <span>{sortOption}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#707477]" />
              </button>
            </div>
          </div>
        </div>

        {/* Projects Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-[#191C20] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-200 group flex flex-col justify-between"
            >
              {/* Card Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-black/40">
                <img
                  src={project.thumbnail}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                
                {/* Duration Badge */}
                <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-mono text-white font-medium border border-white/10">
                  {project.sourceDuration}
                </div>
              </div>

              {/* Card Content & Footer */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-base text-white group-hover:text-[#D5FF3F] transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-xs text-[#707477] mt-1">
                    Edited • {project.editedTime}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  {/* Status Badge */}
                  {project.status === 'Ready' && (
                    <span className="flex items-center gap-1.5 text-xs text-[#D5FF3F] bg-[#D5FF3F]/10 px-2.5 py-1 rounded-full border border-[#D5FF3F]/20 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready
                    </span>
                  )}
                  {project.status === 'Processing' && (
                    <span className="flex items-center gap-1.5 text-xs text-[#FFB13B] bg-[#FFB13B]/10 px-2.5 py-1 rounded-full border border-[#FFB13B]/20 font-medium animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      Processing
                    </span>
                  )}
                  {project.status === 'Draft' && (
                    <span className="flex items-center gap-1.5 text-xs text-[#A7A9A8] bg-white/5 px-2.5 py-1 rounded-full border border-white/10 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#707477]" />
                      Draft
                    </span>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectProject(project)}
                    className="flex items-center gap-1.5 bg-[#24282D] hover:bg-[#D5FF3F] hover:text-black text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* New Project CTA Card */}
          <div
            onClick={onNewProjectClick}
            className="border-2 border-dashed border-white/15 hover:border-[#FF5B63]/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 bg-[#191C20]/40 hover:bg-[#191C20] transition-all cursor-pointer min-h-[260px] group"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[#FF5B63]/20 text-[#A7A9A8] group-hover:text-[#FF5B63] flex items-center justify-center transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">New project</h3>
              <p className="text-xs text-[#707477] mt-1 max-w-[200px]">
                Import a video and let AI turn it into short clips.
              </p>
            </div>
            <button
              className="flex items-center gap-2 bg-[#FF5B63] hover:bg-[#ff7077] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-red-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create new project</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
