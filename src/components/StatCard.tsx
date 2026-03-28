import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string; // tailwind border-l color class
  iconBg: string;
  iconColor: string;
  sub?: string;
  index?: number;
}

export const StatCard = ({ label, value, icon: Icon, accent, iconBg, iconColor, sub, index = 0 }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.07 }}
    className={`bg-white rounded-2xl shadow-sm border-l-4 ${accent} p-4 flex items-center gap-4 hover:shadow-md transition-shadow`}
  >
    <div className={`h-12 w-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
      <Icon className={`h-6 w-6 ${iconColor}`} />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-extrabold text-[#1e3a5f] leading-tight">{value}</p>
      <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
      {sub && <p className="text-xs text-[#1a8fe3] font-medium mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);
