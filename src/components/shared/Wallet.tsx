import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, ChevronLeft, Plus, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Wallet() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 p-6 space-y-8 text-zinc-50">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900 rounded-full text-zinc-50">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-black tracking-tight italic">Wallet</h1>
      </div>

      <div className="bg-emerald-500 p-8 rounded-[32px] space-y-8 text-zinc-950 shadow-2xl shadow-emerald-500/20">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center">
            <CreditCard size={24} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Balance</p>
            <h2 className="text-4xl font-black">₹{profile?.walletBalance || 0}</h2>
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Account Holder</p>
          <h3 className="text-lg font-bold">{profile?.displayName}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="bg-zinc-900 p-6 rounded-3xl flex flex-col items-center gap-3 hover:bg-zinc-900/80 transition-colors border border-zinc-800">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
            <Plus size={20} />
          </div>
          <span className="text-sm font-bold text-zinc-50">Add Money</span>
        </button>
        <button className="bg-zinc-900 p-6 rounded-3xl flex flex-col items-center gap-3 hover:bg-zinc-900/80 transition-colors border border-zinc-800">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
            <History size={20} />
          </div>
          <span className="text-sm font-bold text-zinc-50">Transactions</span>
        </button>
      </div>
    </div>
  );
}
