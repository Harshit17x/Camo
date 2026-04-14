import React, { useState } from 'react';
import { 
  AlertCircle, 
  ShieldAlert, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreVertical, 
  User, 
  Car, 
  MapPin,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { SupportTicket, UserProfile } from '../../../types';

interface SupportSafetyProps {
  tickets: SupportTicket[];
  onUpdateTicketStatus: (ticketId: string, status: string) => void;
  onViewRideDetails: (rideId: string) => void;
}

const SupportSafety: React.FC<SupportSafetyProps> = ({ tickets, onUpdateTicketStatus, onViewRideDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'medium': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sos': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'complaint': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'review': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      default: return <MessageSquare className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Support & Safety</h3>
            <p className="text-xs text-zinc-500">Monitor SOS alerts and handle user complaints</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="sos">SOS Alerts</option>
            <option value="complaint">Complaints</option>
            <option value="review">Reviews</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${
            ticket.type === 'sos' ? 'border-red-500/30' : 'border-zinc-800'
          }`}>
            <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border ${
                  ticket.type === 'sos' ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-950 border-zinc-800'
                }`}>
                  {getTypeIcon(ticket.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">{ticket.type} Alert</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      ticket.status === 'open' ? 'text-amber-500 border-amber-500/20' : 
                      ticket.status === 'investigating' ? 'text-blue-500 border-blue-500/20 bg-blue-500/5' :
                      ticket.status === 'resolved' ? 'text-emerald-500 border-emerald-500/20' : 'text-zinc-500 border-zinc-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{ticket.subject}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2 max-w-2xl">{ticket.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold">
                      <Clock className="w-3 h-3" />
                      <span>
                        {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleString() : new Date(ticket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {ticket.rideId && (
                      <button 
                        onClick={() => onViewRideDetails(ticket.rideId!)}
                        className="flex items-center gap-1 text-[10px] text-blue-500 uppercase font-bold hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Ride Details</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                {ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
                  <div className="flex gap-2 w-full">
                    {ticket.status === 'open' && (
                      <button 
                        onClick={() => onUpdateTicketStatus(ticket.id, 'investigating')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-500/20 transition-colors"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Investigate</span>
                      </button>
                    )}
                    <button 
                      onClick={() => onUpdateTicketStatus(ticket.id, 'resolved')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolve</span>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => onUpdateTicketStatus(ticket.id, 'open')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-500/20 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Reopen</span>
                  </button>
                )}
                <button 
                  onClick={() => onUpdateTicketStatus(ticket.id, 'closed')}
                  className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors"
                  title="Close Ticket"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredTickets.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-xl text-center">
            <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No tickets found</h3>
            <p className="text-sm text-zinc-500">All clear! No active support tickets or SOS alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportSafety;
