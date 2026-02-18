import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users as UsersIcon } from 'lucide-react';

export function RoleSwitcher() {
    const { user, login, MOCK_USERS } = useAuth();
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-maison-secondary hover:text-maison-primary bg-maison-bg rounded-full border border-gray-200 transition-colors"
            >
                <UsersIcon size={14} />
                {user ? `Role: ${user.role.toUpperCase()}` : 'Select Role'}
            </button>

            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-50 text-[10px] uppercase text-gray-400 font-semibold tracking-wider">
                        Switch View
                    </div>
                    {MOCK_USERS.map((u) => (
                        <button
                            key={u.id}
                            onClick={() => {
                                login(u.role);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${user?.role === u.role ? 'text-maison-accent font-medium' : 'text-gray-600'
                                }`}
                        >
                            {u.name} ({u.role})
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
