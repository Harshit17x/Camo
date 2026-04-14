import React, { useState } from 'react';
import { Trash2, AlertOctagon, Database, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const COLLECTIONS = [
  { id: 'audit_logs', name: 'Audit Logs', description: 'System security and action logs' },
  { id: 'rides', name: 'Rides Data', description: 'All ride requests and trips' },
  { id: 'support_tickets', name: 'Support Tickets', description: 'SOS and user support queries' },
  { id: 'rideFeedbacks', name: 'Ride Feedbacks', description: 'Rider ratings and comments' },
  { id: 'notifications', name: 'Notifications', description: 'User push notifications history' },
  { id: 'calls', name: 'Call Data', description: 'WebRTC and VoIP signaling history' }
];

export default function DataCleanerManager() {
  const [cleaningStatus, setCleaningStatus] = useState<Record<string, 'idle' | 'cleaning' | 'done' | 'error'>>({});
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [confirmText, setConfirmText] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const wipeCollection = async (collectionName: string) => {
    if (confirmText !== 'DELETE') {
      alert('You must type DELETE to confirm this destructive action.');
      return;
    }

    setCleaningStatus(prev => ({ ...prev, [collectionName]: 'cleaning' }));
    setProgress(prev => ({ ...prev, [collectionName]: 'Fetching documents...' }));
    
    try {
      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore) {
        // Fetch up to 500 documents
        const snapshot = await getDocs(collection(db, collectionName));
        const docs = snapshot.docs;
        
        if (docs.length === 0) {
          hasMore = false;
          break;
        }

        // Firebase batches are limited to 500 writes
        const chunks = [];
        for (let i = 0; i < docs.length; i += 500) {
          chunks.push(docs.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(d => {
            batch.delete(doc(db, collectionName, d.id));
          });
          await batch.commit();
          totalDeleted += chunk.length;
          setProgress(prev => ({ ...prev, [collectionName]: `Deleted ${totalDeleted} files...` }));
        }
      }

      setCleaningStatus(prev => ({ ...prev, [collectionName]: 'done' }));
      setProgress(prev => ({ ...prev, [collectionName]: `Successfully wiped ${totalDeleted} documents.` }));
      setConfirmText('');
      setSelectedCollection(null);
      
      setTimeout(() => {
        setCleaningStatus(prev => ({ ...prev, [collectionName]: 'idle' }));
        setProgress(prev => ({ ...prev, [collectionName]: '' }));
      }, 5000);

    } catch (error: any) {
      console.error(`Error wiping ${collectionName}:`, error);
      setCleaningStatus(prev => ({ ...prev, [collectionName]: 'error' }));
      setProgress(prev => ({ ...prev, [collectionName]: `Error: ${error.message}` }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/30">
          <AlertOctagon className="text-red-500 w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Data Cleaner</h2>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Hard wipe system collections</p>
        </div>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        
        <div className="flex items-start gap-4 relative z-10">
          <ShieldAlert className="text-red-500 mt-1 shrink-0" />
          <div>
            <h3 className="text-red-500 font-bold mb-2">DANGER ZONE</h3>
            <p className="text-zinc-300 text-sm">
              These actions are permanent and cannot be undone. Wiping these collections will permanently delete real user data, logs, and historical analytics directly from the Firebase Firestore database.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLLECTIONS.map((col) => (
          <div key={col.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-red-500/30 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <Database size={18} className="text-zinc-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold">{col.name}</h4>
                  <p className="text-zinc-500 text-xs">{col.description}</p>
                </div>
              </div>
            </div>

            {selectedCollection === col.id ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-4 border-t border-zinc-800"
              >
                <p className="text-xs text-red-400 font-bold">Type "DELETE" to confirm wipe of {col.id}</p>
                <input 
                  type="text" 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-black border border-red-500/30 rounded-lg px-4 py-2 text-white placeholder:text-zinc-700 outline-none focus:border-red-500 transition-colors"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => wipeCollection(col.id)}
                    disabled={confirmText !== 'DELETE'}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> CONFIRM WIPE
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedCollection(null);
                      setConfirmText('');
                    }}
                    className="px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-between mt-4">
                {cleaningStatus[col.id] === 'cleaning' && (
                  <div className="flex items-center gap-2 text-amber-500 text-xs font-bold animate-pulse">
                    <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    {progress[col.id]}
                  </div>
                )}
                {cleaningStatus[col.id] === 'done' && (
                  <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                    <CheckCircle2 size={16} />
                    {progress[col.id]}
                  </div>
                )}
                {cleaningStatus[col.id] === 'error' && (
                  <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                    <AlertOctagon size={16} />
                    {progress[col.id]}
                  </div>
                )}
                {(!cleaningStatus[col.id] || cleaningStatus[col.id] === 'idle') && (
                  <button 
                    onClick={() => setSelectedCollection(col.id)}
                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-lg border border-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> WIPE DATA
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
