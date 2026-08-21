import { forwardRef, type TextareaHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[12px] font-medium uppercase tracking-wide text-ink-soft"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'min-h-[80px] w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-ink transition-all duration-200',
            'placeholder:text-idle focus:outline-none focus:ring-[3px]',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/15'
              : 'border-line focus:border-granate focus:ring-granate/15',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error ? (
          <span className="text-[12px] text-danger">{error}</span>
        ) : hint ? (
          <span className="text-[12px] text-ink-soft">{hint}</span>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
