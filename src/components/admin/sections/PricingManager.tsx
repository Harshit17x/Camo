import React, { useState, useEffect } from 'react';
import { Settings, Calculator, MapPin, Plus, Trash2, Save, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../firebase';
import { doc, onSnapshot, setDoc, collection } from 'firebase/firestore';
interface FixedRoute {
  id: string;
  origin: string;
  destination: string;
  price: number;
  vehicleCategoryId?: string | null;
}

interface PricingConfig {
  formula: string;
  demandMultiplier: number;
  fixedRoutes: FixedRoute[];
}

export default function PricingManager() {
  const [config, setConfig] = useState<PricingConfig>({
    formula: 'baseFare + (distance * perKmRate)',
    demandMultiplier: 1.0,
    fixedRoutes: []
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vehicle_categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'pricing'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as PricingConfig);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'pricing'), config);
      alert('Pricing configuration saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save pricing config');
    } finally {
      setSaving(false);
    }
  };

  const addFixedRoute = () => {
    setConfig(prev => ({
      ...prev,
      fixedRoutes: [...prev.fixedRoutes, { id: Date.now().toString(), origin: '', destination: '', price: 0, vehicleCategoryId: '' }]
    }));
  };

  const updateFixedRoute = (id: string, field: keyof FixedRoute, value: any) => {
    setConfig(prev => ({
      ...prev,
      fixedRoutes: prev.fixedRoutes.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const deleteFixedRoute = (id: string) => {
    setConfig(prev => ({
      ...prev,
      fixedRoutes: prev.fixedRoutes.filter(r => r.id !== id)
    }));
  };

  if (loading) {
    return <div className="text-zinc-500 p-8 text-center animate-pulse">Loading pricing config...</div>;
  }

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
            <Calculator className="text-blue-500 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Pricing Engine</h2>
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Absolute Fare Control</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
          SAVE CONFIG
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Formula */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
            <FileSpreadsheet className="text-emerald-500" />
            <h3 className="text-white font-bold text-lg">Master Formula</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Mathematical Algorithm</label>
              <textarea 
                value={config.formula}
                onChange={e => setConfig({...config, formula: e.target.value})}
                className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-emerald-400 font-mono focus:border-emerald-500 outline-none transition-colors h-32"
                placeholder="(baseFare + (distance * perKmRate))"
              />
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <h4 className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Available Variables
              </h4>
              <ul className="grid grid-cols-2 gap-2 text-xs text-zinc-400 font-mono bg-black/30 p-2 rounded-lg">
                <li>baseFare</li>
                <li>perKmRate</li>
                <li>distance (km)</li>
                <li>duration (mins)</li>
                <li>demandMultiplier</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mt-4 mb-2">Demand / Surge Multiplier (Global)</label>
              <input 
                type="number" 
                step="0.1"
                min="0.1"
                value={config.demandMultiplier}
                onChange={e => setConfig({...config, demandMultiplier: parseFloat(e.target.value) || 1})}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                placeholder="1.0"
              />
            </div>
          </div>
        </div>

        {/* Fixed Routes Overlay */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="text-purple-500" />
              <h3 className="text-white font-bold text-lg">Fixed Routes Map</h3>
            </div>
            <button 
              onClick={addFixedRoute}
              className="w-8 h-8 bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg flex items-center justify-center transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <p className="text-xs text-zinc-500 mb-4">Fix routes will totally bypass the master formula if both pickup and destination fully match the strings below.</p>
          
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {config.fixedRoutes.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-medium">No fixed routes defined.</div>
            ) : (
              <AnimatePresence>
                {config.fixedRoutes.map(route => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={route.id} 
                    className="bg-black border border-zinc-800 rounded-xl p-3 flex gap-2 items-center"
                  >
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        value={route.origin}
                        onChange={e => updateFixedRoute(route.id, 'origin', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500"
                        placeholder="Origin String Match"
                      />
                      <input 
                        type="text" 
                        value={route.destination}
                        onChange={e => updateFixedRoute(route.id, 'destination', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500"
                        placeholder="Destination String Match"
                      />
                      <select
                        value={route.vehicleCategoryId || ''}
                        onChange={e => updateFixedRoute(route.id, 'vehicleCategoryId', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500"
                      >
                        <option value="">All Categories (Any Vehicle)</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Price (₹)</div>
                      <input 
                        type="number" 
                        value={route.price}
                        onChange={e => updateFixedRoute(route.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-3 text-emerald-400 font-bold outline-none focus:border-emerald-500 text-center"
                      />
                    </div>
                    <button 
                      onClick={() => deleteFixedRoute(route.id)}
                      className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
