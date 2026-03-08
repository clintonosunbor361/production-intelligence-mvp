import React, { forwardRef, useState, InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

// 1. Define the props for your custom Input
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    labelRight?: React.ReactNode;
    error?: string;
}

// 2. Pass the HTML element type (HTMLInputElement) and your custom props (InputProps) to forwardRef
export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, labelRight, error, className, type = 'text', ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        const isPassword = type === 'password';
        const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className="w-full">
                {(label || labelRight) && (
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-sm font-medium text-maison-secondary">
                            {label}
                        </label>
                        {labelRight && <div className="text-xs">{labelRight}</div>}
                    </div>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        type={inputType}
                        className={clsx(
                            "block w-full rounded-lg border-gray-200 shadow-sm focus:border-maison-accent focus:ring-maison-accent sm:text-sm py-2.5",
                            error && "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
                            isPassword && "pr-10",
                            className
                        )}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    )}
                </div>
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
