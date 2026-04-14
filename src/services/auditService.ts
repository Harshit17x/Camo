import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface AuditLogEntry {
  id?: string;
  action: string;
  userEmail: string;
  userId?: string;
  ipAddress?: string;
  details?: string;
  timestamp?: any;
}

export const logSecurityEvent = async (entry: AuditLogEntry) => {
  try {
    const logsRef = collection(db, 'audit_logs');
    await addDoc(logsRef, {
      ...entry,
      timestamp: serverTimestamp(),
      // We can't easily get the real IP address from client-side JS without an external API,
      // so we'll just use a placeholder or whatever is provided.
      ipAddress: entry.ipAddress || 'Client',
    });
    console.log('Security event logged:', entry.action);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};
