import { useEffect, useRef, useState } from 'preact/hooks';
import type { WorkoutSettings } from '../../domain/schema';
import { ModalDialog } from './ModalDialog';

export interface SettingsModalProps {
  open: boolean;
  settings: WorkoutSettings;
  voiceSupported: boolean;
  onClose: () => void;
  onSave: (next: Partial<WorkoutSettings>) => void;
  onTestBeep: () => void;
  onTestVoice: () => void;
}

export function SettingsModal({
  open,
  settings,
  voiceSupported,
  onClose,
  onSave,
  onTestBeep,
  onTestVoice,
}: SettingsModalProps) {
  const [workSec, setWorkSec] = useState(settings.workSec);
  const [restSec, setRestSec] = useState(settings.restSec);
  const [rounds, setRounds] = useState(settings.rounds);
  const [includeWarmup, setIncludeWarmup] = useState(settings.includeWarmup);
  const [includeCooldown, setIncludeCooldown] = useState(settings.includeCooldown);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled);

  const lastSyncedRef = useRef({ open, settings });

  useEffect(() => {
    const prev = lastSyncedRef.current;
    lastSyncedRef.current = { open, settings };
    if (!open || (prev.open === open && prev.settings === settings)) return;
    setWorkSec(settings.workSec);
    setRestSec(settings.restSec);
    setRounds(settings.rounds);
    setIncludeWarmup(settings.includeWarmup);
    setIncludeCooldown(settings.includeCooldown);
    setSoundEnabled(settings.soundEnabled);
    setVoiceEnabled(settings.voiceEnabled);
  }, [open, settings]);

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
      title="Circuit Timer & Audio Settings"
      titleId="modal-settings-heading"
      maxWidthClass="max-w-md"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} class="space-y-4">
        <div class="grid grid-cols-3 gap-3">
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
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
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
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
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
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
            />
          </div>
        </div>

        <div class="space-y-2 pt-1">
          <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
            <div>
              <span class="text-sm font-semibold text-slate-200 block">Warm-Up Phase (2 min)</span>
              <span class="text-xs text-slate-400">Bodyweight shoulder mobility & arm circles</span>
            </div>
            <input
              type="checkbox"
              checked={includeWarmup}
              onChange={(e) => setIncludeWarmup((e.target as HTMLInputElement).checked)}
              class="w-5 h-5 accent-emerald-500 rounded"
            />
          </label>

          <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
            <div>
              <span class="text-sm font-semibold text-slate-200 block">
                Cool-Down Stretch (1 min)
              </span>
              <span class="text-xs text-slate-400">Upper body recovery stretch</span>
            </div>
            <input
              type="checkbox"
              checked={includeCooldown}
              onChange={(e) => setIncludeCooldown((e.target as HTMLInputElement).checked)}
              class="w-5 h-5 accent-emerald-500 rounded"
            />
          </label>

          <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
            <div>
              <span class="text-sm font-semibold text-slate-200 block">Interval Beeps</span>
              <span class="text-xs text-slate-400">
                Audio tones for 3-2-1 countdowns & transitions
              </span>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled((e.target as HTMLInputElement).checked)}
              class="w-5 h-5 accent-emerald-500 rounded"
            />
          </label>

          <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
            <div>
              <span class="text-sm font-semibold text-slate-200 block">Voice Announcements</span>
              <span class="text-xs text-slate-400">
                {voiceSupported
                  ? 'Spoken exercise names & 3-2-1 countdowns'
                  : 'Not supported by this browser'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={voiceEnabled}
              disabled={!voiceSupported}
              onChange={(e) => setVoiceEnabled((e.target as HTMLInputElement).checked)}
              class="w-5 h-5 accent-emerald-500 rounded disabled:opacity-40"
            />
          </label>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTestBeep}
              class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 transition"
            >
              Test Beeps
            </button>
            {voiceSupported && (
              <button
                type="button"
                onClick={onTestVoice}
                class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-400 transition"
              >
                Test Voice
              </button>
            )}
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-bold text-slate-950 transition"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
