import React, { forwardRef } from 'react';
import clsx from 'clsx';

export const Input = forwardRef(({ label, error, className, ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-maison-secondary mb-1.5">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={clsx(
                    "block w-full rounded-lg border-gray-200 shadow-sm focus:border-maison-accent focus:ring-maison-accent sm:text-sm py-2.5",
                    error && "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';
