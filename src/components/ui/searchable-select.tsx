
"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const contentRef = useRef<HTMLDivElement | null>(null);

  const filteredOptions = useMemo(() => {
    if (!search) return options.slice(0, 100);
    return options.filter(option =>
      option.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 100);
  }, [options, search]);

  // Close the dropdown on any window/page scroll so it never floats over
  // unrelated sections, and never re-appears as a stale ghost when the user
  // scrolls back to the top. Ignore scroll events that originate from inside
  // the dropdown's own scroll area.
  useEffect(() => {
    if (!open) return;

    let isJustOpened = true;
    const timer = setTimeout(() => {
      isJustOpened = false;
    }, 150);

    const handleScroll = (event: Event) => {
      if (isJustOpened) return;
      const target = event.target as Node | null;
      if (target && contentRef.current && contentRef.current.contains(target)) {
        return;
      }
      setOpen(false);
      setSearch('');
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  // Reset transient state on unmount so a stale "open" never survives a route
  // change or component re-mount.
  useEffect(() => {
    return () => {
      setOpen(false);
      setSearch('');
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        collisionPadding={8}
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div className="p-2">
            <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
        <ScrollArea className="h-72">
            {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                    <Button
                        key={`${option}-${index}`}
                        variant="ghost"
                        className={cn(
                            "w-full justify-start text-left font-normal h-auto py-2 px-2 whitespace-normal",
                            value === option && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => {
                            onChange(option);
                            setOpen(false);
                            setSearch('');
                        }}
                    >
                         <Check
                            className={cn(
                                "mr-2 h-4 w-4",
                                value === option ? "opacity-100" : "opacity-0"
                            )}
                        />
                        {option}
                    </Button>
                ))
            ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    No results found.
                </div>
            )}
            {filteredOptions.length === 100 && (
                <div className="p-2 text-center text-xs text-muted-foreground italic border-t mt-2">
                    Start typing to see more results...
                </div>
            )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
