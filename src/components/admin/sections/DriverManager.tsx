import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  User, 
  Star, 
  IndianRupee, 
  CheckCircle2, 
  XCircle, 
  FileText,
  AlertTriangle,
  Ban,
  ShieldCheck,
  ShieldAlert,
  X,
  ExternalLink,
  Car
} from 'lucide-react';
import { DriverProfile, UserProfile } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';

interface DriverManagerProps {
  drivers: (DriverProfile & { profile?: UserProfile })[];
  onUpdateStatus: (uid: string, status: 'online' | 'offline' | 'busy') => void;
  onToggleSuspension: (uid: string, isSuspended: boolean) => void;
  onVerifyDocuments: (uid: string, verified: boolean) => void;
}

const DriverManager: React.FC<DriverManagerProps> = ({ 
  drivers, 
  onUpdateStatus, 
  onToggleSuspension,
  onVerifyDocuments
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'busy'>('all');
  const [selectedDriver, setSelectedDriver] = useState<(DriverProfile & { profile?: UserProfile }) | null>(null);

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.profile?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search drivers by name or email..." 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
          <button className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white hover:bg-zinc-800 transition-colors">
            <Filter className="w-4 h-4" />
            <span>More Filters</span>
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950 border-b border-zinc-800">
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Driver</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Vehicle</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Rating</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Earnings</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Documents</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredDrivers.map((driver) => (
                <tr key={driver.uid} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                        {driver.profilePhoto || driver.profile?.photoURL ? (
                          <img src={driver.profilePhoto || driver.profile?.photoURL || ''} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                          {driver.profile?.displayName || 'Unknown'}
                          {driver.profile?.isSuspended && (
                            <span className="bg-red-500/10 text-red-500 text-[10px] px-1.5 py-0.5 rounded border border-red-500/20">Suspended</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">{driver.profile?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        driver.status === 'online' ? 'bg-green-500' : 
                        driver.status === 'busy' ? 'bg-yellow-500' : 'bg-zinc-500'
                      }`} />
                      <span className="text-xs text-zinc-300 capitalize">{driver.status}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-zinc-300">
                      {driver.vehicleNo || driver.vehicleId || 'N/A'}
                      <div className="text-[10px] text-zinc-500 uppercase">{driver.vehicleType || 'Standard'}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-xs text-yellow-500">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{driver.rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-xs text-emerald-500">
                      <IndianRupee className="w-3 h-3" />
                      <span>{driver.earnings.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {driver.documents?.verified ? (
                        <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold uppercase">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold uppercase">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onToggleSuspension(driver.uid, !driver.profile?.isSuspended)}
                        className={`p-2 rounded-lg transition-colors ${
                          driver.profile?.isSuspended ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                        }`}
                        title={driver.profile?.isSuspended ? 'Unsuspend Driver' : 'Suspend Driver'}
                      >
                        {driver.profile?.isSuspended ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => setSelectedDriver(driver)}
                        className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
                        title="View Documents"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Verification Modal */}
      <AnimatePresence>
        {selectedDriver && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700">
                    <img src={selectedDriver.profilePhoto || selectedDriver.profile?.photoURL || ''} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedDriver.profile?.displayName}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">Document Verification</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDriver(null)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Vehicle Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Vehicle Type</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Car size={16} className="text-emerald-500" />
                      {selectedDriver.vehicleType || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Vehicle Number</div>
                    <div className="text-sm font-bold text-white">{selectedDriver.vehicleNo || 'N/A'}</div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">UPI ID</div>
                    <div className="text-sm font-bold text-emerald-500">{selectedDriver.upiNumber || 'N/A'}</div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">License No</div>
                    <div className="text-sm font-bold text-white">{selectedDriver.licenseNo || 'N/A'}</div>
                  </div>
                </div>

                {/* Document Photos */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Uploaded Documents</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* License */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-500">Driving License</span>
                        {selectedDriver.licensePhoto && (
                          <a href={selectedDriver.licensePhoto} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px]">
                            View Full <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="aspect-video bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                        {selectedDriver.licensePhoto ? (
                          <img src={selectedDriver.licensePhoto} alt="License" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">No Photo</div>
                        )}
                      </div>
                    </div>

                    {/* Aadhar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-500">Aadhar Card ({selectedDriver.aadharNumber})</span>
                        {selectedDriver.aadharPhoto && (
                          <a href={selectedDriver.aadharPhoto} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px]">
                            View Full <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="aspect-video bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                        {selectedDriver.aadharPhoto ? (
                          <img src={selectedDriver.aadharPhoto} alt="Aadhar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">No Photo</div>
                        )}
                      </div>
                    </div>

                    {/* RC Book */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-500">RC Book ({selectedDriver.rcBookNumber})</span>
                        {selectedDriver.rcBookPhoto && (
                          <a href={selectedDriver.rcBookPhoto} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline flex items-center gap-1 text-[10px]">
                            View Full <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="aspect-video bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                        {selectedDriver.rcBookPhoto ? (
                          <img src={selectedDriver.rcBookPhoto} alt="RC Book" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">No Photo</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800 flex gap-4">
                <button 
                  onClick={() => {
                    onVerifyDocuments(selectedDriver.uid, false);
                    setSelectedDriver(null);
                  }}
                  className="flex-1 bg-zinc-800 text-zinc-400 font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-all"
                >
                  Reject Documents
                </button>
                <button 
                  onClick={() => {
                    onVerifyDocuments(selectedDriver.uid, true);
                    setSelectedDriver(null);
                  }}
                  className="flex-1 bg-emerald-500 text-zinc-950 font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} />
                  Approve & Verify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DriverManager;
