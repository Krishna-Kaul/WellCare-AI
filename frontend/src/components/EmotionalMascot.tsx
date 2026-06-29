import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface MascotProps {
  streakDays: number;
  isCompleted?: boolean;
  patientName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BotMascot({ streakDays, isCompleted = false, patientName = "", size = "md", className = "" }: MascotProps) {
  const sizes = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-40 h-40"
  };

  // Determine glow color based on streak level
  let glowColor = "shadow-cyan-400/50";
  let flameColor = "text-cyan-400";
  let badgeColor = "bg-cyan-500";
  
  if (streakDays >= 7) {
    glowColor = "shadow-amber-400/70";
    flameColor = "text-amber-400";
    badgeColor = "bg-amber-500";
  } else if (streakDays >= 3) {
    glowColor = "shadow-emerald-400/60";
    flameColor = "text-emerald-400";
    badgeColor = "bg-emerald-500";
  }

  return (
    <div className={`relative flex flex-col items-center justify-center gap-3 bg-white/40 backdrop-blur-md border border-white/60 shadow-xl rounded-[2.5rem] p-5 pt-6 ${className}`}>
      {/* Container with glowing aura */}
      <motion.div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-b from-slate-50 to-slate-200 shadow-inner ${sizes[size]}`}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glow behind robot */}
        <div className={`absolute inset-0 rounded-full blur-xl opacity-80 shadow-2xl ${glowColor}`} />
        
        {/* Robot Image */}
        <div className="relative z-10 w-full h-full overflow-hidden rounded-full flex items-center justify-center bg-transparent">
          <img 
            src="/assets/bots/mascot.png" 
            alt="Bot Mascot" 
            className="w-[120%] h-[120%] object-cover drop-shadow-2xl mix-blend-multiply" 
            style={{ mixBlendMode: 'multiply' }} 
          />
        </div>

        {/* Streak Badge Overlay */}
        <motion.div 
          className="absolute -top-2 -right-2 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-lg border border-white/50"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="relative">
            <Flame className={`h-8 w-8 ${flameColor} drop-shadow-md`} fill="currentColor" />
            <div className={`absolute inset-0 flex items-center justify-center pt-2.5`}>
              <span className="text-[11px] font-black text-white drop-shadow-sm">
                {streakDays}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Dynamic Text Section */}
      <div className="flex flex-col items-center text-center mt-1">
        <span className={`text-xs font-bold uppercase tracking-widest ${isCompleted ? 'text-success' : 'text-primary'}`}>
          {isCompleted ? "Streak Completed" : "Complete Your Streak"}
        </span>
        {patientName && (
          <span className="text-lg font-black text-slate-800 mt-0.5">
            {patientName}
          </span>
        )}
      </div>
    </div>
  );
}
