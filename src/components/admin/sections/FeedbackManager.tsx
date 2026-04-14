import React from 'react';
import { Star, MessageSquare, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface RideFeedback {
  id: string;
  rideId?: string;
  riderId?: string;
  driverId?: string;
  rating: number;
  comment?: string;
  createdAt: any;
  riderName?: string;
  driverName?: string;
}

interface FeedbackManagerProps {
  feedbacks: RideFeedback[];
}

export default function FeedbackManager({ feedbacks }: FeedbackManagerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Ride Feedbacks</h2>
          <p className="text-zinc-400">Monitor rider ratings and suggestions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbacks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500 font-medium">
            No feedback records found.
          </div>
        ) : (
          feedbacks.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(num => (
                      <Star 
                        key={num} 
                        size={16} 
                        className={num <= f.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'} 
                      />
                    ))}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-0.5">
                    For Driver: <span className="text-blue-400">{f.driverName || 'Unknown Driver'}</span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    From: {f.riderName || 'Anonymous Rider'}
                  </p>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase bg-black/50 px-2 py-1 rounded">
                  {f.rating}/5
                </div>
              </div>

              {f.comment && (
                <div className="bg-black/30 rounded-xl p-4 mb-4 border border-zinc-800">
                  <div className="flex items-start gap-2">
                    <MessageSquare size={14} className="text-emerald-500 mt-1 shrink-0" />
                    <p className="text-sm text-zinc-300 italic">"{f.comment}"</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-zinc-500 text-xs">
                  <Calendar size={12} />
                  {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString() : 'Recent'}
                </div>
                <div className="text-[10px] font-mono text-zinc-600 bg-zinc-950 px-2 py-1 rounded-md">
                  Ride: {f.rideId?.substring(0, 6) || 'N/A'}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
