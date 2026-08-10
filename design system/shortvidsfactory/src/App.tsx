import React, { useState, useEffect } from 'react';
import { AppScreen, Project, ScriptOption } from './types';
import { INITIAL_PROJECTS, INITIAL_SCRIPTS } from './data/initialData';
import { WindowChrome } from './components/WindowChrome';
import { ProjectsScreen } from './components/screens/ProjectsScreen';
import { NewProjectScreen } from './components/screens/NewProjectScreen';
import { ChooseScriptScreen } from './components/screens/ChooseScriptScreen';
import { EditorScreen } from './components/screens/EditorScreen';
import { ExportingScreen } from './components/screens/ExportingScreen';
import { SettingsModal } from './components/Modals/SettingsModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('projects');
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState<Project | null>(INITIAL_PROJECTS[1]); // Creativity Talk
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [exportDestination, setExportDestination] = useState<string>('/Users/yass/Videos/Exports');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    if (project.status === 'Processing') {
      setCurrentScreen('scripts');
    } else {
      setCurrentScreen('editor');
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProject(newProject);
    showToast(`Project "${newProject.title}" created successfully!`);
  };

  const handleSelectScript = (script: ScriptOption) => {
    if (activeProject) {
      const updatedProject = {
        ...activeProject,
        selectedScriptId: script.id,
        status: 'Ready' as const,
      };
      setActiveProject(updatedProject);
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );
    }
    setCurrentScreen('editor');
    showToast(`Script "${script.title}" selected for editing.`);
  };

  const handleSaveProject = () => {
    setHasUnsavedChanges(false);
    showToast('Project changes saved securely to disk!');
  };

  const handleStartExport = (destPath: string) => {
    setExportDestination(destPath);
    setCurrentScreen('exporting');
    showToast('Export job started...');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-screen h-screen bg-[#0D0F11] flex flex-col justify-center items-center overflow-hidden font-sans antialiased text-[#F5F5F2] p-0 md:p-3">
      {/* Outer Desktop Window Frame */}
      <div className="w-full h-full max-w-[1600px] max-h-[1000px] bg-[#111316] border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Desktop Application Header Chrome */}
        <WindowChrome
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          activeProject={activeProject}
          onNewProjectClick={() => setCurrentScreen('upload')}
          hasUnsavedChanges={hasUnsavedChanges}
          onSaveProject={handleSaveProject}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Dynamic Screen Router */}
        <div className="flex-1 overflow-hidden relative">
          {currentScreen === 'projects' && (
            <ProjectsScreen
              projects={projects}
              onSelectProject={handleSelectProject}
              onNewProjectClick={() => setCurrentScreen('upload')}
              onOpenSettings={() => setIsSettingsOpen(true)}
              setCurrentScreen={setCurrentScreen}
            />
          )}

          {currentScreen === 'upload' && (
            <NewProjectScreen
              onProjectCreated={handleProjectCreated}
              setCurrentScreen={setCurrentScreen}
            />
          )}

          {currentScreen === 'scripts' && (
            <ChooseScriptScreen
              activeProject={activeProject}
              onSelectScript={handleSelectScript}
              setCurrentScreen={setCurrentScreen}
            />
          )}

          {currentScreen === 'editor' && (
            <EditorScreen
              activeProject={activeProject}
              setCurrentScreen={setCurrentScreen}
              onStartExport={handleStartExport}
              onMarkUnsaved={setHasUnsavedChanges}
            />
          )}

          {currentScreen === 'exporting' && (
            <ExportingScreen
              activeProject={activeProject}
              destinationPath={exportDestination}
              setCurrentScreen={setCurrentScreen}
            />
          )}
        </div>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="absolute bottom-6 right-6 z-50 bg-[#D5FF3F] text-black font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
