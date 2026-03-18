import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookMarked, Plus, Trash2, Save, X, Clock, Loader2, ChevronRight, ArrowLeft } from "lucide-react";
import { Button, Input, Dialog } from "./ui/core";
import type { FinancialProfile } from "@workspace/api-client-react";
import { useScenarios, type ScenarioMeta } from "@/hooks/use-scenarios";

interface ScenarioManagerProps {
  profile: FinancialProfile;
  onLoad: (profile: FinancialProfile) => void;
  onActiveScenarioChange?: (scenario: { id: string; name: string; profile: FinancialProfile }) => void;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ScenarioManager({ profile, onLoad, onActiveScenarioChange }: ScenarioManagerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [saveDesc, setSaveDesc] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const {
    scenarios, isLoading, fetchScenarios, saveScenario, loadScenario, deleteScenario,
  } = useScenarios();

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setSelectedIndex(0);
    setConfirmDeleteId(null);
    setLoadingId(null);
    setDeletingId(null);
    fetchScenarios();
  };

  const handleSave = async () => {
    const trimmedName = saveName.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    let cancelled = false;
    let result = await saveScenario(trimmedName, saveDesc.trim(), profile);

    if (!result.id && result.conflictId) {
      const confirmed = window.confirm(
        `A config named "${trimmedName}" already exists. Overwrite it?`
      );
      if (confirmed) {
        result = await saveScenario(trimmedName, saveDesc.trim(), profile, {
          overwriteExisting: true,
        });
      } else {
        cancelled = true;
      }
    }

    setIsSaving(false);

    if (result.id) {
      showFeedback(result.overwritten ? "Config overwritten!" : "Config saved!");
      onActiveScenarioChange?.({ id: result.id, name: trimmedName, profile });
      setSaveName("");
      setSaveDesc("");
      setIsSaveDialogOpen(false);
      fetchScenarios();
      return;
    }

    if (cancelled) {
      showFeedback("Overwrite cancelled");
      return;
    }

    showFeedback("Unable to save config");
  };

  const handleLoad = React.useCallback(async (scenario: ScenarioMeta) => {
    setLoadingId(scenario.id);
    const data = await loadScenario(scenario.id);
    setLoadingId(null);
    if (data) {
      onLoad(data);
      onActiveScenarioChange?.({ id: scenario.id, name: scenario.name, profile: data });
      setIsOpen(false);
      showFeedback(`Loaded "${scenario.name}"`);
    }
  }, [loadScenario, onLoad, onActiveScenarioChange]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteScenario(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    fetchScenarios();
    setSelectedIndex((i) => Math.min(i, Math.max(0, scenarios.length - 2)));
  };

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen || isSaveDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (e.key === "Enter" && scenarios[selectedIndex] && confirmDeleteId !== scenarios[selectedIndex].id) {
        handleLoad(scenarios[selectedIndex]);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, scenarios.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isSaveDialogOpen, selectedIndex, scenarios, handleLoad]);

  React.useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, scenarios.length - 1)));
  }, [scenarios.length]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-full transition-colors"
      >
        <BookMarked className="w-4 h-4" />
        <span className="hidden sm:inline">Configs</span>
      </button>

      {/* Portal: renders outside header stacking context */}
      {createPortal(
        <>
          {/* Inline feedback toast */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg"
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game-style full-screen load menu */}
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Dark overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
                  style={{
                    backgroundImage: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
                  }}
                  onClick={() => setIsOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none"
                >
                  <div
                    className="pointer-events-auto w-full max-w-2xl max-h-[calc(100vh-3rem)] flex flex-col bg-card/98 backdrop-blur-2xl border border-border/70 rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 25px 50px -12px rgba(0,0,0,0.6), 0 0 80px -20px hsl(var(--primary) / 0.15)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                {/* Title bar - game menu style */}
                <div className="shrink-0 px-8 py-6 border-b border-border/50 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <h2 className="font-display font-bold text-2xl tracking-[0.2em] text-center uppercase text-foreground">
                    Load from Memory
                  </h2>
                  <p className="text-xs text-muted-foreground/80 text-center mt-2 tracking-wider">
                    Saved configurations
                  </p>
                </div>

                {/* Two-panel layout: slots + preview */}
                <div className="flex flex-col sm:flex-row min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                  {/* Slot list */}
                  <div className="flex-1 px-6 py-6 min-h-0 overflow-y-auto custom-scrollbar border-b sm:border-b-0 sm:border-r border-border/40">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      </div>
                    ) : scenarios.length === 0 ? (
                      <div className="text-center py-20 space-y-4">
                        <div className="w-16 h-16 rounded-xl bg-secondary/50 flex items-center justify-center mx-auto">
                          <BookMarked className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No saved configs</p>
                        <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
                          Save your current setup to load it later
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-2" role="menu">
                        {scenarios.map((s, idx) => {
                          const isSelected = selectedIndex === idx;
                          const isLoadingThis = loadingId === s.id;
                          const isConfirmingDelete = confirmDeleteId === s.id;

                          return (
                            <li key={s.id} role="menuitem">
                              <div
                                className={`
                                  group flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150
                                  ${isSelected
                                    ? "bg-primary/15 border-2 border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                                    : "bg-secondary/20 border-2 border-transparent hover:bg-secondary/40 hover:border-border/40"
                                  }
                                `}
                                onClick={() => !isConfirmingDelete && handleLoad(s)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                              >
                                <div className="w-10 flex justify-center shrink-0 font-display font-bold text-xs tabular-nums text-muted-foreground">
                                  {String(idx + 1).padStart(2, "0")}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium truncate ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                                    {s.name}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground/70">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    {formatRelativeTime(s.updatedAt)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isConfirmingDelete ? (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                        className="text-xs px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/80"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                                        disabled={deletingId === s.id}
                                        className="text-xs px-2 py-1 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 flex items-center gap-1"
                                      >
                                        {deletingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        Delete
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(confirmDeleteId === s.id ? null : s.id); }}
                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                      {isSelected && !isLoadingThis && (
                                        <ChevronRight className="w-5 h-5 text-primary/80" />
                                      )}
                                      {isLoadingThis && (
                                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Preview panel */}
                  <div className="w-full sm:w-72 shrink-0 p-6 bg-secondary/10 border-t sm:border-t-0 border-border/30">
                    {scenarios[selectedIndex] ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                            Selected
                          </p>
                          <p className="font-display font-semibold text-foreground">
                            {scenarios[selectedIndex].name}
                          </p>
                        </div>
                        {scenarios[selectedIndex].description && (
                          <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">
                            {scenarios[selectedIndex].description}
                          </p>
                        )}
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-[10px] text-muted-foreground/60">
                            Last saved {formatRelativeTime(scenarios[selectedIndex].updatedAt)}
                          </p>
                        </div>
                        <Button
                          className="w-full gap-2 mt-2"
                          onClick={() => handleLoad(scenarios[selectedIndex])}
                          disabled={loadingId === scenarios[selectedIndex].id}
                        >
                          {loadingId === scenarios[selectedIndex].id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          Load Config
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center">
                        <p className="text-xs text-muted-foreground/60">
                          Select a slot to preview
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="shrink-0 px-6 py-5 border-t border-border/50 flex flex-col sm:flex-row gap-3 bg-gradient-to-t from-black/10 to-transparent">
                  <Button
                    variant="ghost"
                    className="flex-1 gap-2 order-2 sm:order-1"
                    onClick={() => setIsOpen(false)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    className="flex-1 gap-2 order-1 sm:order-2"
                    onClick={() => setIsSaveDialogOpen(true)}
                  >
                    <Save className="w-4 h-4" />
                    Save Current Config
                  </Button>
                </div>

                {/* Keyboard hint */}
                {scenarios.length > 0 && (
                  <div className="shrink-0 px-6 py-2.5 border-t border-border/30 bg-black/20">
                    <p className="text-[10px] text-muted-foreground/50 text-center tracking-wider uppercase">
                      ↑↓ Select · Enter Load · Esc Close
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

          {/* Save dialog */}
          <Dialog isOpen={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)} title="Save Config">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Config Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  autoFocus
                  placeholder="e.g. Aggressive growth plan, 2026 baseline..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-input/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                  rows={3}
                  placeholder="What's different about this scenario..."
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setIsSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleSave}
                  disabled={!saveName.trim() || isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Config
                </Button>
              </div>
            </div>
          </Dialog>
        </>,
        document.body
      )}
    </>
  );
}
