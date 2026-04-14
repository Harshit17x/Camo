import React from 'react';
import { AlertTriangle, Hammer, Clock, ShieldAlert } from 'lucide-react';

export const MaintenanceScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
          <div className="relative bg-zinc-900 p-6 rounded-3xl border border-red-500/20 shadow-2xl">
            <Hammer className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <div className="flex items-center justify-center gap-2 text-red-500 font-mono text-[10px] uppercase tracking-[0.3em] mb-2">
              <ShieldAlert className="w-3 h-3" />
              <span>System Offline</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Under Maintenance</h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              We're currently performing scheduled system updates to improve your experience. 
              The app will be back online shortly.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <Clock className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Est. Time</div>
                <div className="text-sm font-bold text-white">~30 Mins</div>
              </div>
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <AlertTriangle className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Status</div>
                <div className="text-sm font-bold text-white">Updating</div>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-8">
          CampusMobility Infrastructure v1.0.1
        </p>
        
        <div className="mt-12">
          <a href="/login" className="text-zinc-800 hover:text-zinc-600 text-[10px] transition-colors">
            Admin Access
          </a>
        </div>
      </div>
    </div>
  );
};
