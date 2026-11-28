import { useEffect, useRef, useState } from 'preact/hooks';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WorkoutSettings, WorkoutSpace } from '../../domain/schema';
import type { SpaceFormInput } from '../../state/workoutStore';
import { SpacesPanel } from '../settings/SpacesPanel';
import { ModalDialog } from './ModalDialog';

export type SettingsTab = 'general' | 'spaces' | 'data';

export interface SettingsModalProps {
  open: boolean;
  initialTab?: SettingsTab;
  settings: WorkoutSettings;
  voiceSupported: boolean;
  spaces: readonly WorkoutSpace[];
  activeSpaceId: string;
  onClose: () => void;
  onSave: (next: Partial<WorkoutSettings>) => void;
  onTestBeep: () => void;
  onTestVoice: () => void;
  onSelectSpace: (spaceId: string) => void;
  onSaveSpace: (input: SpaceFormInput) => WorkoutSpace | null;
  onDeleteSpace: (spaceId: string) => void;
  onExportJson: () => void;
  onImportFile: (file: File) => void;
  onRestoreDefaults: () => void;
  updateAvailable?: boolean;
  onCheckForUpdate?: () => void;
  onForceReload?: () => void;
}

export function SettingsModal({
  open,
  initialTab = 'general',
  settings,
  voiceSupported,
  spaces,
  activeSpaceId,
  onClose,
  onSave,
  onTestBeep,
  onTestVoice,
  onSelectSpace,
  onSaveSpace,
  onDeleteSpace,
  onExportJson,
  onImportFile,
  onRestoreDefaults,
  updateAvailable = false,
  onCheckForUpdate,
  onForceReload,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [workSec, setWorkSec] = useState(settings.workSec);
  const [restSec, setRestSec] = useState(settings.restSec);
  const [rounds, setRounds] = useState(settings.rounds);
  const [includeWarmup, setIncludeWarmup] = useState(settings.includeWarmup);
  const [includeCooldown, setIncludeCooldown] = useState(settings.includeCooldown);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled);

  const lastSyncedRef = useRef({ open, initialTab, settings });

  useEffect(() => {
    const prev = lastSyncedRef.current;
    lastSyncedRef.current = { open, initialTab, settings };
    if (!open) return;
    if (prev.open !== open || prev.initialTab !== initialTab) {
      setActiveTab(initialTab);
    }
    if (prev.open === open && prev.settings === settings) return;
    setWorkSec(settings.workSec);
    setRestSec(settings.restSec);
    setRounds(settings.rounds);
    setIncludeWarmup(settings.includeWarmup);
    setIncludeCooldown(settings.includeCooldown);
    setSoundEnabled(settings.soundEnabled);
    setVoiceEnabled(settings.voiceEnabled);
  }, [open, initialTab, settings]);

  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    onSave({
      workSec: Math.min(300, Math.max(10, Math.round(workSec) || 40)),
      restSec: Math.min(180, Math.max(5, Math.round(restSec) || 20)),
      rounds: Math.min(12, Math.max(1, Math.round(rounds) || 3)),
      includeWarmup,
      includeCooldown,
      soundEnabled,
      voiceEnabled,
    });
    onClose();
  };

  return (
    <ModalDialog
      open={open}
      title="Settings"
      titleId="modal-settings-heading"
      maxWidthClass="max-w-lg"
      onClose={onClose}
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === 'general' || value === 'spaces' || value === 'data') {
            setActiveTab(value);
          }
        }}
      >
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="general">Timer & Audio</TabsTrigger>
          <TabsTrigger value="spaces">Spaces ({spaces.length})</TabsTrigger>
          <TabsTrigger value="data">Data & Backup</TabsTrigger>
        </TabsList>

        {/* Tab 1: Timer & Audio */}
        <TabsContent value="general">
          <form onSubmit={handleSubmit} class="space-y-3.5">
            {/* Group 1: Circuit Intervals */}
            <section class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Circuit Intervals
              </h3>

              <div class="grid grid-cols-3 gap-2.5">
                <div>
                  <label for="set-work" class="block text-xs font-semibold text-slate-300 mb-1">
                    Work (sec)
                  </label>
                  <input
                    id="set-work"
                    type="number"
                    min={10}
                    max={300}
                    value={workSec}
                    onInput={(e) => setWorkSec(Number((e.target as HTMLInputElement).value))}
                    class="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label for="set-rest" class="block text-xs font-semibold text-slate-300 mb-1">
                    Rest (sec)
                  </label>
                  <input
                    id="set-rest"
                    type="number"
                    min={5}
                    max={180}
                    value={restSec}
                    onInput={(e) => setRestSec(Number((e.target as HTMLInputElement).value))}
                    class="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label for="set-rounds" class="block text-xs font-semibold text-slate-300 mb-1">
                    Rounds
                  </label>
                  <input
                    id="set-rounds"
                    type="number"
                    min={1}
                    max={12}
                    value={rounds}
                    onInput={(e) => setRounds(Number((e.target as HTMLInputElement).value))}
                    class="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div class="pt-2 border-t border-slate-800/80 space-y-2.5">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <span
                      id="label-warmup"
                      class="text-xs sm:text-sm font-semibold text-slate-200 block"
                    >
                      Warm-Up Phase (2 min)
                    </span>
                    <span class="text-[11px] text-slate-400">
                      Bodyweight shoulder mobility & arm circles
                    </span>
                  </div>
                  <Switch
                    aria-labelledby="label-warmup"
                    checked={includeWarmup}
                    onCheckedChange={(checked) => setIncludeWarmup(checked)}
                  />
                </div>

                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <span
                      id="label-cooldown"
                      class="text-xs sm:text-sm font-semibold text-slate-200 block"
                    >
                      Cool-Down Stretch (1 min)
                    </span>
                    <span class="text-[11px] text-slate-400">Upper body recovery stretch</span>
                  </div>
                  <Switch
                    aria-labelledby="label-cooldown"
                    checked={includeCooldown}
                    onCheckedChange={(checked) => setIncludeCooldown(checked)}
                  />
                </div>
              </div>
            </section>

            {/* Group 2: Audio & Voice Coaching */}
            <section class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Audio & Voice Coaching
                </h3>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onTestBeep}
                    class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-emerald-400 whitespace-nowrap transition"
                  >
                    Test Beeps
                  </button>
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={onTestVoice}
                      class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-sky-400 whitespace-nowrap transition"
                    >
                      Test Voice
                    </button>
                  )}
                </div>
              </div>

              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <span
                    id="label-sound"
                    class="text-xs sm:text-sm font-semibold text-slate-200 block"
                  >
                    Interval Beeps
                  </span>
                  <span class="text-[11px] text-slate-400">
                    Audio tones for 3-2-1 countdowns & transitions
                  </span>
                </div>
                <Switch
                  aria-labelledby="label-sound"
                  checked={soundEnabled}
                  onCheckedChange={(checked) => setSoundEnabled(checked)}
                />
              </div>

              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <span
                    id="label-voice"
                    class="text-xs sm:text-sm font-semibold text-slate-200 block"
                  >
                    Voice Announcements
                  </span>
                  <span class="text-[11px] text-slate-400">
                    {voiceSupported
                      ? 'Spoken exercise names & 3-2-1 countdowns'
                      : 'Not supported by this browser'}
                  </span>
                </div>
                <Switch
                  aria-labelledby="label-voice"
                  checked={voiceEnabled}
                  disabled={!voiceSupported}
                  onCheckedChange={(checked) => setVoiceEnabled(checked)}
                />
              </div>
            </section>

            <div class="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs sm:text-sm font-bold text-slate-950 transition"
              >
                Save & Apply
              </button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Workout Spaces */}
        <TabsContent value="spaces">
          <SpacesPanel
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onSelectSpace={onSelectSpace}
            onSaveSpace={onSaveSpace}
            onDeleteSpace={onDeleteSpace}
            onDone={onClose}
          />
        </TabsContent>

        {/* Tab 3: Data & Backup */}
        <TabsContent value="data">
          <div class="space-y-3.5">
            <section class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Backup & Transfer
              </h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Export all routines, Workout Spaces, custom exercises, and session history as a JSON
                file to back up or move to another device.
              </p>
              <div class="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onExportJson}
                  class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  Export JSON
                </button>
                <label class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 text-center transition cursor-pointer">
                  Import JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    class="hidden"
                    onChange={(e) => {
                      const input = e.target as HTMLInputElement;
                      const file = input.files?.[0];
                      if (file) onImportFile(file);
                      input.value = '';
                    }}
                  />
                </label>
              </div>
            </section>

            <section class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <span class="text-xs sm:text-sm font-semibold text-slate-200 block">
                  Reset Active Routine
                </span>
                <span class="text-[11px] text-slate-400">
                  Restores default exercises without deleting Spaces or history.
                </span>
              </div>
              <button
                type="button"
                onClick={onRestoreDefaults}
                class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 shrink-0 transition"
              >
                Reset Defaults
              </button>
            </section>

            <section class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div class="flex items-center justify-between gap-2">
                <span class="text-slate-300 font-semibold">Installed Offline App Version</span>
                <span class="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-mono font-semibold text-emerald-300">
                  {import.meta.env.VITE_APP_VERSION ?? 'dev'}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Check for a newer release or force-refresh the offline app cache without erasing
                your saved routines, Spaces, or history.
              </p>
              <div class="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={onCheckForUpdate}
                  class="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-semibold text-emerald-300 transition"
                >
                  {updateAvailable ? 'Install Update' : 'Check for Update'}
                </button>
                <button
                  type="button"
                  onClick={onForceReload}
                  class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  Force Reload App
                </button>
              </div>
            </section>

            <div class="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Done
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </ModalDialog>
  );
}
