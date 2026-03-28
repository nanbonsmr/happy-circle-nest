import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LogOut, Bell } from "lucide-react";
import logo from "@/assets/logo.png";

interface NavItem {
  icon: React.ElementType;
  label: string;
  tab: string;
}

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  navItems: NavItem[];
  onLogout: () => void;
  userName: string;
  userEmail: string;
  role?: "admin" | "teacher";
  headerTitle: string;
  headerAction?: ReactNode;
  liveCount?: number;
  children: ReactNode;
}

export const DashboardLayout = ({
  activeTab, onTabChange, navItems, onLogout,
  userName, userEmail, role, headerTitle, headerAction, liveCount, children,
}: Props) => {
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a8fe3] via-[#1a7fd4] to-[#1565c0] p-3 sm:p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto rounded-2xl shadow-2xl overflow-hidden bg-white/10 backdrop-blur-sm flex h-[calc(100vh-48px)] min-h-[600px]">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 lg:w-64 flex-col bg-white rounded-l-2xl shadow-lg">
          {/* Logo */}
          <div className="p-5 flex flex-col items-center gap-2 border-b border-slate-100">
            <img src={logo} alt="NejoExamPrep" className="h-14 w-14 rounded-full object-cover shadow-md" />
            <div className="text-center">
              <p className="font-bold text-[#1e3a5f] text-sm leading-tight">NejoExamPrep</p>
              <p className="text-xs text-slate-400">Nejo Ifa Boru School</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => onTabChange(item.tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-[#1a8fe3] text-white shadow-md shadow-blue-200"
                      : "text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f]"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col bg-[#f0f4f8] rounded-r-2xl overflow-hidden">
          {/* Top header */}
          <header className="bg-white px-5 py-3.5 flex items-center justify-between border-b border-slate-100 shrink-0">
            <div>
              <h1 className="text-lg font-bold text-[#1e3a5f]">{headerTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              {liveCount !== undefined && liveCount > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {liveCount} live
                </div>
              )}
              {headerAction}
              <button type="button" className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Notifications">
                <Bell className="h-4 w-4 text-slate-500" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="h-8 w-8 rounded-full bg-[#1a8fe3] flex items-center justify-center text-white text-xs font-bold">
                  {initials || "U"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-[#1e3a5f] leading-tight">{userName}</p>
                  {role && (
                    <p className="text-xs text-slate-400 capitalize">{role}</p>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
