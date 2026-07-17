import React from 'react';
import { Shield, CloudLightning, CloudOff, LogOut, Moon, Sun, Award } from 'lucide-react';
import { Member } from '../types';

interface HeaderProps {
  currentUser: Member | null;
  isAdmin: boolean;
  isOffline: boolean;
  onLogout: () => void;
  guildName?: string;
}

export default function Header({ currentUser, isAdmin, isOffline, onLogout, guildName }: HeaderProps) {
  return (
    <header className="bg-slate-950/70 border-b border-blue-500/20 shadow-[0_4px_20px_rgba(59,130,246,0.08)] sticky top-0 z-40 backdrop-blur-md" id="app-header">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Brand Logo & Vibe */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-md"></div>
            <div className="relative w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)] font-sans font-black text-lg text-white border border-blue-400/30">
              {(guildName || 'RO CLASSIC GUILD').trim().charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-extrabold text-base sm:text-lg text-white tracking-tight uppercase">
                {guildName || 'RO CLASSIC GUILD'}
              </span>
              <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-mono font-bold">
                CLASSIC
              </span>
            </div>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none mt-0.5">
              ระบบประมูล & วงล้อสุ่มไอเทมลีก (OverRun & Guild League)
            </p>
          </div>
        </div>

        {/* Status / User Section */}
        <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
          
          {/* Online/Offline indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isOffline 
              ? 'bg-red-950/40 text-red-400 border-red-500/20' 
              : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
          }`} title={isOffline ? "กำลังใช้งานโหมดออฟไลน์ ข้อมูลจะเก็บไว้ในเครื่อง" : "เชื่อมต่อฐานข้อมูลเรียลไทม์แล้ว"}>
            {isOffline ? (
              <>
                <CloudOff className="w-3.5 h-3.5" />
                <span>ออฟไลน์</span>
              </>
            ) : (
              <>
                <CloudLightning className="w-3.5 h-3.5 animate-pulse" />
                <span>ออนไลน์</span>
              </>
            )}
          </div>

          {/* User profile */}
          {currentUser && (
            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-200">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-yellow-500 font-mono flex items-center gap-0.5">
                  {isAdmin ? (
                    <>
                      <Shield className="w-2.5 h-2.5 text-yellow-500" />
                      <span>Admin</span>
                    </>
                  ) : (
                    <span>Member</span>
                  )}
                </span>
              </div>
              
              <button 
                onClick={onLogout}
                className="ml-1 p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                title="ออกจากระบบ"
                id="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
