import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Lock, 
  Globe, 
  Bell, 
  Shield, 
  Database, 
  Save,
  AlertTriangle,
  Mail,
  Languages,
  DollarSign,
  Plus,
  X
} from 'lucide-react';
import { doc, onSnapshot, setDoc, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { logSecurityEvent, AuditLogEntry } from '../../../services/auditService';

interface SystemSettings {
  maintenanceMode: boolean;
  baseFareMultiplier: number;
  adminEmails: string[];
  supportedLanguages: string[];
  lastUpdated?: any;
}

const SystemConfig: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    baseFareMultiplier: 1.0,
    adminEmails: ['25bcscs017@student.rru.ac.in'],
    supportedLanguages: ['en', 'hi', 'gu']
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SystemSettings);
      }
      setLoading(false);
    });

    const logsQuery = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(10));
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLogEntry));
      setAuditLogs(logs);
    });

    return () => {
      unsubConfig();
      unsubLogs();
    };
  }, []);

  const handleUpdate = async (updates: Partial<SystemSettings>, actionDescription: string) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'config'), {
        ...settings,
        ...updates,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      if (user) {
        await logSecurityEvent({
          action: actionDescription,
          userEmail: user.email || 'Unknown',
          userId: user.uid,
          details: JSON.stringify(updates)
        });
      }
    } catch (err) {
      console.error('Failed to update system settings:', err);
      alert('Failed to update settings: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    if (settings.adminEmails.includes(newAdminEmail)) {
      alert('This email is already an administrator.');
      return;
    }
    const updatedEmails = [...settings.adminEmails, newAdminEmail];
    await handleUpdate({ adminEmails: updatedEmails }, `Added Administrator: ${newAdminEmail}`);
    setNewAdminEmail('');
    setIsAddingAdmin(false);
  };

  const handleRemoveAdmin = async (emailToRemove: string) => {
    if (emailToRemove === '25bcscs017@student.rru.ac.in') {
      alert('Cannot remove the primary administrator.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${emailToRemove} from administrators?`)) {
      const updatedEmails = settings.adminEmails.filter(e => e !== emailToRemove);
      await handleUpdate({ adminEmails: updatedEmails }, `Removed Administrator: ${emailToRemove}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading configuration...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Configuration</h2>
          <p className="text-zinc-500 text-sm">Manage global application settings and security controls.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
          <Database className="w-3 h-3" />
          <span>Cluster: asia-southeast1</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance Mode */}
        <div className={`p-6 rounded-2xl border transition-all ${settings.maintenanceMode ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.maintenanceMode ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Maintenance Mode</h3>
                <p className="text-xs text-zinc-500">Disable all client operations</p>
              </div>
            </div>
            <button
              onClick={() => handleUpdate({ maintenanceMode: !settings.maintenanceMode }, `Toggled Maintenance Mode to ${!settings.maintenanceMode}`)}
              disabled={saving}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.maintenanceMode ? 'bg-red-500' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenanceMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            When active, users will see a maintenance screen and will not be able to book rides or log in. Drivers will also be restricted.
          </p>
        </div>

        {/* Pricing Controls */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Pricing Multiplier</h3>
              <p className="text-xs text-zinc-500">Global fare adjustment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="0.5" 
              max="3.0" 
              step="0.1"
              value={settings.baseFareMultiplier}
              onChange={(e) => handleUpdate({ baseFareMultiplier: parseFloat(e.target.value) }, `Updated Base Fare Multiplier to ${e.target.value}`)}
              className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="w-16 text-center py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-bold text-white">
              {settings.baseFareMultiplier}x
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 mt-4">
            Adjusts the base fare for all ride categories. Use with caution during peak hours.
          </p>
        </div>

        {/* Admin Access */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Admin Access</h3>
              <p className="text-xs text-zinc-500">Authorized email addresses</p>
            </div>
          </div>
          <div className="space-y-2">
            {settings.adminEmails.map((email, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs group">
                <span className="text-zinc-300">{email}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Verified</span>
                  {email !== '25bcscs017@student.rru.ac.in' && (
                    <button 
                      onClick={() => handleRemoveAdmin(email)}
                      className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {isAddingAdmin ? (
            <div className="mt-4 space-y-2">
              <input
                type="email"
                placeholder="Admin Email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleAddAdmin}
                  disabled={saving}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  Save
                </button>
                <button 
                  onClick={() => { setIsAddingAdmin(false); setNewAdminEmail(''); }}
                  className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAddingAdmin(true)}
              className="w-full mt-4 py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-3 h-3" /> Add Administrator
            </button>
          )}
        </div>

        {/* Language Support */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-500">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Localization</h3>
              <p className="text-xs text-zinc-500">Supported languages</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['English', 'हिन्दी', 'ગુજરાતી'].map((lang, idx) => (
              <div key={idx} className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {lang}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 mt-6">
            System currently supports 3 languages. Translation files are managed in the core repository.
          </p>
        </div>
      </div>

      {/* Security Logs Placeholder */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-zinc-500" />
            <h3 className="font-bold text-white">Security Audit Logs</h3>
          </div>
          <button className="text-xs text-blue-500 hover:underline">View Full Logs</button>
        </div>
        <div className="space-y-4">
          {auditLogs.length > 0 ? auditLogs.map((log, idx) => {
            const timeString = (log as any).timestamp?.toDate ? (log as any).timestamp.toDate().toLocaleString() : 'Just now';
            return (
              <div key={log.id || idx} className="flex items-center justify-between text-xs py-2 border-b border-zinc-900 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-zinc-300 font-medium">{log.action}</span>
                  <span className="text-zinc-600">{log.userEmail}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-600">{log.ipAddress}</span>
                  <span className="text-zinc-500">{timeString}</span>
                </div>
              </div>
            );
          }) : (
            <div className="text-xs text-zinc-500 text-center py-4">No audit logs found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
