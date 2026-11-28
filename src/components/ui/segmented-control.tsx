/**
 * Reusable accessible segmented pill toggle following shadcn + Base UI conventions
 * (`cn()`, `data-slot`, `data-state`, `role="group"`, `aria-pressed`).
 */

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  testId?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'xs' | 'sm';
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'sm',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-slot="segmented-control"
      className={joinClasses(
        'inline-flex items-center gap-0.5 rounded-lg bg-slate-950/85 border border-slate-800 p-0.5',
        size === 'xs' ? 'text-[10px]' : 'text-xs gap-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            data-slot="segmented-control-item"
            data-state={active ? 'active' : 'inactive'}
            data-testid={opt.testId}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={joinClasses(
              'rounded-md font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60',
              size === 'xs'
                ? 'px-2 py-0.5 font-bold tracking-wide border'
                : 'px-3 sm:px-2.5 py-1 rounded-lg',
              active
                ? size === 'xs'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-emerald-400'
                : size === 'xs'
                  ? 'text-slate-400 hover:text-white border-transparent'
                  : 'text-slate-400 hover:text-white',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
