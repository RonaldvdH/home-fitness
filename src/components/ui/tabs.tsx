import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import type { ComponentChildren } from 'preact';
import { cn } from '@/lib/utils';

type WithoutRef<T> = Omit<T, 'ref'>;

export interface TabsProps extends Omit<WithoutRef<TabsPrimitive.Root.Props>, 'children'> {
  children?: ComponentChildren;
}

function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-3', className)}
      {...props}
    />
  );
}

export interface TabsListProps extends Omit<WithoutRef<TabsPrimitive.List.Props>, 'children'> {
  children?: ComponentChildren;
}

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'grid grid-flow-col auto-cols-fr gap-1 rounded-2xl bg-slate-950 p-1 border border-slate-800',
        className,
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends Omit<WithoutRef<TabsPrimitive.Tab.Props>, 'children'> {
  children?: ComponentChildren;
}

function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-400 transition outline-none hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-emerald-500/60 data-[active]:bg-slate-800 data-[active]:text-emerald-300 data-[active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export interface TabsContentProps extends Omit<WithoutRef<TabsPrimitive.Panel.Props>, 'children'> {
  children?: ComponentChildren;
}

function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn('outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
