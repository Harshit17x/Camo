import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../services/api';
import { SupportTicket } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, MessageSquare, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function SupportTickets() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({
    type: 'complaint' as 'complaint' | 'review' | 'sos',
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportTicket[];
      setTickets(ticketData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTicket.subject || !newTicket.description) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        ...newTicket,
        userId: user.uid,
        status: 'open',
        createdAt: serverTimestamp()
      });

      // If it's an SOS ticket, also trigger the automated call
      if (newTicket.type === 'sos') {
        try {
          const idToken = await user.getIdToken();
          await fetch(getApiUrl('/api/sos-call'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              userId: user.uid,
              userName: profile?.displayName || user.displayName || 'User',
              location: null, // Location might not be available here
              rideId: null
            }),
          });
        } catch (sosError) {
          console.error("Failed to trigger SOS call from support ticket:", sosError);
        }
      }

      setIsCreating(false);
      setNewTicket({ type: 'complaint', subject: '', description: '', priority: 'medium' });
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded';
      case 'high': return 'text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded';
      case 'medium': return 'text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded';
      case 'low': return 'text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded';
      default: return 'text-zinc-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'in_progress': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'investigating': return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
      case 'resolved': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'closed': return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'complaint': return <AlertTriangle size={14} className="text-zinc-500" />;
      case 'review': return <MessageSquare size={14} className="text-zinc-500" />;
      case 'sos': return <AlertTriangle size={14} className="text-red-500" />;
      default: return <MessageSquare size={14} className="text-zinc-500" />;
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-zinc-950 overflow-y-auto no-scrollbar"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 20px))' }}
      >
      {/* ════════ HEADER ════════ */}
      <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md pt-14 pb-4 px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#0c0c0e] border border-white/[0.03] flex items-center justify-center transition-transform active:scale-95"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white tracking-tight">Support & Help</h1>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Ticket Center</span>
          </div>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-4 py-2 rounded-full border border-emerald-500/20 active:opacity-70 transition-opacity flex items-center gap-1.5"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {/* ════════ CONTENT ════════ */}
      <div className="px-5 pt-4 pb-24 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-6 h-6 border-2 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1c1c1e] to-[#121213] border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex items-center justify-center mb-4">
              <MessageSquare size={24} className="text-zinc-700" />
            </div>
            <p className="text-white font-bold text-sm tracking-tight mb-1">No support tickets</p>
            <p className="text-zinc-600 text-xs font-medium mb-4">You haven't submitted any tickets yet.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="text-emerald-500 text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
            >
              Create your first ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => (
              <motion.div 
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#1c1c1e] to-[#121213] border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] rounded-2xl p-5 block relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      {getTypeIcon(ticket.type)}
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-bold tracking-tight">{ticket.subject}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">
                          {ticket.createdAt?.toDate ? new Date(ticket.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                        </span>
                        <span className="text-zinc-700 text-[9px]">•</span>
                        <span className={`text-[8.5px] font-black uppercase tracking-[0.1em] ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-[0.2em] border ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-zinc-500 text-xs font-medium line-clamp-2 leading-relaxed ml-11">
                  {ticket.description}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ════════ CREATE TICKET MODAL ════════ */}
      </div>
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-zinc-950 w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] flex flex-col max-h-[90vh] shadow-[0_-8px_40px_rgba(0,0,0,0.5)] overflow-hidden border-t border-white/[0.05] sm:border"
            >
              <div className="flex justify-between items-center p-6 border-b border-white/[0.03]">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">New Ticket</h2>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">How can we help?</p>
                </div>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="w-10 h-10 rounded-full bg-zinc-900 border border-white/[0.03] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form 
                onSubmit={handleSubmit} 
                className="p-6 space-y-5 overflow-y-auto no-scrollbar"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 24px))' }}
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Issue Type</label>
                  <select 
                    value={newTicket.type}
                    onChange={(e) => setNewTicket({...newTicket, type: e.target.value as any})}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 appearance-none transition-all"
                  >
                    <option value="complaint">Complaint</option>
                    <option value="review">General Inquiry / Review</option>
                    <option value="sos">Safety Concern (SOS)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Priority</label>
                  <select 
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value as any})}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 appearance-none transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Subject</label>
                  <input 
                    type="text"
                    required
                    placeholder="Brief description of the issue"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Details</label>
                  <textarea 
                    required
                    placeholder="Please provide as much detail as possible..."
                    rows={4}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none transition-all placeholder:text-zinc-600"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submitting || !newTicket.subject || !newTicket.description}
                  className="w-full py-4 mt-4 bg-emerald-500 text-black text-sm font-black uppercase tracking-wider rounded-2xl active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(16,185,129,0.15)] disabled:shadow-none"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isCreating && <BottomNav activeTab="support" />}
    </>
  );
}
