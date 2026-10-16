// components/simple-multi-select.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type Option = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function SimpleMultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select options...",
  className = "",
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle toggle selection
  const handleToggle = (value: string) => {
    if (disabled) return;
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Handle removal
  const handleRemove = (value: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (disabled) return;
    onChange(selected.filter(item => item !== value));
  };

  // Add custom tag on Enter if searched term doesn't match an exact value
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      const trimmed = searchTerm.trim();
      const existing = options.find(o => o.value.toLowerCase() === trimmed.toLowerCase() || o.label.toLowerCase() === trimmed.toLowerCase());
      const valToAdd = existing ? existing.value : trimmed;
      if (!selected.includes(valToAdd)) {
        onChange([...selected, valToAdd]);
      }
      setSearchTerm('');
    } else if (e.key === 'Backspace' && !searchTerm && selected.length > 0) {
      handleRemove(selected[selected.length - 1]);
    }
  };

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-1.5 p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 min-h-[42px] cursor-text transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : ''
        }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            const input = containerRef.current?.querySelector('input');
            if (input) input.focus();
          }
        }}
      >
        {selected.map(value => {
          const option = options.find(o => o.value === value);
          const label = option?.label || value;
          return (
            <Badge
              key={value}
              variant="secondary"
              className="rounded-md px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/80 flex items-center gap-1"
            >
              <span>{label}</span>
              {!disabled && (
                <button
                  type="button"
                  className="rounded-full hover:bg-blue-200/60 dark:hover:bg-blue-800/60 p-0.5 transition-colors cursor-pointer"
                  onClick={(e) => handleRemove(value, e)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          );
        })}

        {!disabled && (
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selected.length === 0 ? placeholder : ''}
            className="flex-1 outline-none bg-transparent min-w-[80px] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 py-1"
          />
        )}

        <div className="ml-auto pl-1 text-slate-400 shrink-0 pointer-events-none">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-[240px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                  onClick={() => handleToggle(option.value)}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                </div>
              );
            })
          ) : (
            <div className="px-3 py-3 text-xs text-slate-400 text-center">
              {searchTerm ? (
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">Enter</kbd> to add "{searchTerm}"</span>
              ) : (
                <span>No options found</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
