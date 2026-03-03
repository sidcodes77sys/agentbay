import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'category' | 'success' | 'warning' | 'error';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-800 text-gray-300',
  category: 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20',
  success: 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
};

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
