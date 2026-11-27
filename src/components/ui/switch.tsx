import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

type WithoutRef<T> = Omit<T, 'ref'>;

export type SwitchProps = WithoutRef<SwitchPrimitive.Root.Props>;

function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-slate-700 bg-slate-800 p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 data-[checked]:border-emerald-400/60 data-[checked]:bg-emerald-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-150 translate-x-0 data-[checked]:translate-x-5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
