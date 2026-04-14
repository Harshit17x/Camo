import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  User, 
  Car, 
  IndianRupee, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  Plus,
  Navigation,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RideRequest, UserProfile } from '../../../types';

interface RideOperationsProps {
  rides: RideRequest[];
  onCancelRide: (rideId: string) => void;
  onManualBooking: () => void;
  highlightRideId?: string;
}

const RideOperations: React.FC<RideOperationsProps> = ({ rides, onCancelRide, onManualBooking, highlightRideId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset to page 1 when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const filteredRides = rides.filter(r => {
    const matchesSearch = r.riderName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRides.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRides = filteredRides.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'searching': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'accepted': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'started': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'cancelled': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search rides by ID, rider, or driver..." 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="searching">Searching</option>
            <option value="accepted">Accepted</option>
            <option value="started">Started</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button 
            onClick={onManualBooking}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Booking</span>
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950 border-b border-zinc-800">
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Ride ID</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Rider</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Driver</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Route</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Fare</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {paginatedRides.map((ride) => {
                const isHighlighted = highlightRideId === ride.id;
                return (
                  <tr 
                    key={ride.id} 
                    className={`hover:bg-zinc-800/50 transition-all duration-500 ${isHighlighted ? 'bg-red-500/10 border-y border-red-500/30' : ''}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {isHighlighted && (
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                        )}
                        <div className="text-xs font-mono text-zinc-400">#{ride.id.slice(-6).toUpperCase()}</div>
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-1">
                        {ride.createdAt?.toDate ? ride.createdAt.toDate().toLocaleString() : new Date(ride.createdAt).toLocaleString()}
                      </div>
                    </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <User className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="text-sm text-white">{ride.riderName || 'Unknown'}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <Car className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="text-sm text-white">{ride.driverName || 'Not Assigned'}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="max-w-[200px] space-y-1">
                      <div className="flex items-start gap-1 text-[10px] text-zinc-400 truncate">
                        <MapPin className="w-3 h-3 text-green-500 shrink-0" />
                        <span>{ride.pickup.address}</span>
                      </div>
                      <div className="flex items-start gap-1 text-[10px] text-zinc-400 truncate">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span>{ride.dropoff.address}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                      <IndianRupee className="w-3 h-3" />
                      <span>{ride.fare.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">{ride.rideType}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(ride.status)}`}>
                      {ride.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors">
                        <Navigation className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onCancelRide(ride.id)}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                        disabled={ride.status === 'completed' || ride.status === 'cancelled'}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="text-sm text-zinc-500">
            Showing <span className="font-bold text-white">{startIndex + 1}</span> to <span className="font-bold text-white">{Math.min(startIndex + itemsPerPage, filteredRides.length)}</span> of <span className="font-bold text-white">{filteredRides.length}</span> rides
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center px-4 text-sm font-bold text-white">
              Page {currentPage} of {totalPages}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideOperations;
