'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ProgressStep {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
  onStepClick?: (stepId: string) => void;
  isClickable?: boolean;
}

export function ProgressIndicator({ 
  steps, 
  className,
  onStepClick,
  isClickable = false 
}: ProgressIndicatorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            'flex items-start gap-4',
            isClickable && 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg'
          )}
          onClick={() => isClickable && onStepClick?.(step.id)}
        >
          <div className="relative flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step.status === 'completed' && 'bg-brand-500 text-white',
                step.status === 'current' && 'ring-2 ring-brand-500 ring-offset-2 bg-white text-brand-600',
                step.status === 'upcoming' && 'bg-gray-200 text-gray-500'
              )}
            >
              {step.status === 'completed' ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-0.5 h-8 mt-1',
                  step.status === 'completed' ? 'bg-brand-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
          <div className="pt-1 flex-1">
            <p
              className={cn(
                'text-sm font-medium',
                step.status === 'completed' && 'text-gray-900',
                step.status === 'current' && 'text-brand-600',
                step.status === 'upcoming' && 'text-gray-500'
              )}
            >
              {step.title}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className,
  showLabel = false,
  size = 'md' 
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizes[size])}>
        <div
          className="bg-brand-gradient h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
