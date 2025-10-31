'use client';

import React, { memo, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ControlledSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

// Memoized Select component to prevent unnecessary re-renders
const ControlledSelect = memo(function ControlledSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled = false,
}: ControlledSelectProps) {
  
  // Memoize the change handler
  const handleValueChange = useCallback((newValue: string) => {
    if (newValue !== value) {
      onValueChange(newValue);
    }
  }, [value, onValueChange]);
  
  // Ensure value is always valid
  const safeValue = React.useMemo(() => {
    if (!value) return undefined;
    return options.some(opt => opt.value === value) ? value : undefined;
  }, [value, options]);
  
  return (
    <Select 
      value={safeValue} 
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-render if props haven't actually changed
  return (
    prevProps.value === nextProps.value &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.options.length === nextProps.options.length &&
    prevProps.placeholder === nextProps.placeholder
  );
});

export default ControlledSelect;