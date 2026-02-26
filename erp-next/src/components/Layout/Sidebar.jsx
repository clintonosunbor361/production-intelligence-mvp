"use client";
import {
  LayoutDashboard,
  ShoppingBag,
  Box,
  Users,
  PieChart,
  Shirt,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "../../context/SupabaseAuthContext";

const ALL_NAV = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "production", "qc", "accounts", "completion"],
  },
  {
    name: "Production",
    href: "/production",
    icon: Shirt,
    roles: ["admin", "production"],
  },
  { name: "QC Queue", href: "/qc", icon: CheckCircle2, roles: ["admin", "qc"] },
  {
    name: "Completion",
    href: "/completion",
    icon: Box,
    roles: ["admin", "completion"],
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: ShoppingBag,
    roles: ["admin", "accounts"],
  },
  { name: "Tailors", href: "/tailors", icon: Users, roles: ["admin"] },
  { name: "Products", href: "/products", icon: Shirt, roles: ["admin"] },
  { name: "Task Types", href: "/categories", icon: Box, roles: ["admin"] },
  { name: "Rates", href: "/rates", icon: PieChart, roles: ["admin"] },
];

export function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { role } = useAuth();

  const navigation = ALL_NAV.filter(item => {
    if (!role) return false;
    return item.roles.includes(role);
  });
  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 bg-maison-surface border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-6 h-20">
          <div className="flex items-center gap-3">
            <div className="bg-maison-primary text-white p-2 rounded-md">
              <Shirt size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-serif text-lg font-medium leading-none">
                Maison
              </h1>
              <p className="text-xs text-maison-secondary tracking-widest uppercase mt-1">
                Couture ERP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-maison-secondary hover:text-maison-primary"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 mt-6 overflow-y-auto">
          <div className="px-2 mb-2 text-xs font-medium text-maison-secondary uppercase tracking-wider">
            Atelier
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon; // Capitalize to use as a component
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-maison-bg text-maison-primary"
                    : "text-maison-secondary",
                )}
              >
                <Icon className="mr-3 h-5 w-5" /> {/* Add this line back! */}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Status */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center text-xs font-medium text-maison-secondary px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
            System Operational
          </div>
        </div>
      </div>
    </>
  );
}
