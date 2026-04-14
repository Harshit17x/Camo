import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface SystemConfig {
  maintenanceMode: boolean;
  baseFareMultiplier: number;
  adminEmails: string[];
  supportedLanguages: string[];
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as SystemConfig);
      } else {
        // Default config if not exists
        setConfig({
          maintenanceMode: false,
          baseFareMultiplier: 1.0,
          adminEmails: ['25bcscs017@student.rru.ac.in'],
          supportedLanguages: ['en', 'hi', 'gu']
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { config, loading };
}
