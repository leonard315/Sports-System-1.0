"use client";

import { Trophy, ArrowRight, Activity, ShieldCheck, Globe, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all duration-1000">
      {/* Decorative Blobs */}
      <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" />

      <div className="max-w-5xl w-full text-center space-y-16 relative z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 bg-slate-900/80 border border-white/5 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.3em] text-slate-400 shadow-2xl backdrop-blur-xl">
            <Zap className="w-4 h-4 text-primary animate-pulse" />
            ArenaLeader Pro Tabulation Engine
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-primary to-blue-700 rounded-[3rem] flex items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.3)] rotate-12 transition-all hover:rotate-0 hover:scale-110 duration-700 cursor-pointer">
              <Trophy className="w-16 h-16 text-white drop-shadow-2xl" />
            </div>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white leading-[0.8]">
            Arena<span className="text-primary">Leader</span>
          </h1>
          <p className="text-slate-400 text-2xl md:text-3xl max-w-3xl mx-auto leading-relaxed font-medium">
            The ultimate broadcast-grade platform for tournament tabulation. 
            Sync results, manage rosters, and showcase champions in real-time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href={user ? "/dashboard" : "/login"}>
            <Button size="lg" className="h-20 px-14 text-xl font-black gap-4 rounded-3xl premium-shadow group bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-primary/20">
              {user ? "Access Dashboard" : "Get Started"}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
          <Link href="/standings">
            <Button variant="outline" size="lg" className="h-20 px-14 text-xl font-black rounded-3xl bg-slate-900/50 border-white/5 text-white hover:bg-slate-800 backdrop-blur-sm transition-all hover:scale-105">
              Live Rankings
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-white/5">
          <div className="space-y-4 group">
            <div className="flex justify-center text-primary group-hover:scale-125 transition-transform duration-500"><ShieldCheck className="w-10 h-10" /></div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Enterprise Secure</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Cryptographic audit trails for all score entries powered by Firebase Security Rules.</p>
          </div>
          <div className="space-y-4 group">
            <div className="flex justify-center text-primary group-hover:scale-125 transition-transform duration-500"><Activity className="w-10 h-10" /></div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Broadcast Ready</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Sub-second synchronization across all broadcast devices and viewer portals.</p>
          </div>
          <div className="space-y-4 group">
            <div className="flex justify-center text-primary group-hover:scale-125 transition-transform duration-500"><Globe className="w-10 h-10" /></div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Certified Math</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Automated points computation with 100% precision for tie-breaker scenarios.</p>
          </div>
        </div>

        <div className="pt-8">
          <p className="text-[11px] text-slate-600 font-black uppercase tracking-[0.5em]">
            Official Global Registry Portal
          </p>
        </div>
      </div>
    </div>
  );
}