import React from 'react';
import clsx from 'clsx';

export function Card({ children, className, padding = 'p-6', ...props }) {
    return (
        <div
            className={clsx(
                "bg-maison-surface rounded-[var(--radius-card)] border border-gray-100 shadow-sm",
                padding,
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
