import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  FileText, 
  Filter,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { DriverProfile, UserProfile } from '../../../types';

interface RevenueAnalyticsProps {
  revenueData: any[];
  categoryData: any[];
  drivers: (DriverProfile & { profile?: UserProfile })[];
  onExportData: (format: 'csv' | 'pdf' | 'excel') => void;
}

const RevenueAnalytics: React.FC<RevenueAnalyticsProps> = ({ revenueData, categoryData, drivers, onExportData }) => {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const topDrivers = [...drivers]
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);

  const ratingDistribution = [
    { name: '5 Star', value: drivers.filter(d => d.rating >= 4.5).length },
    { name: '4 Star', value: drivers.filter(d => d.rating >= 3.5 && d.rating < 4.5).length },
    { name: '3 Star', value: drivers.filter(d => d.rating >= 2.5 && d.rating < 3.5).length },
    { name: '2 Star', value: drivers.filter(d => d.rating >= 1.5 && d.rating < 2.5).length },
    { name: '1 Star', value: drivers.filter(d => d.rating < 1.5).length },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleExportCSV = () => {
    const headers = ['Date', 'Revenue'];
    const csvContent = [
      headers.join(','),
      ...revenueData.map(row => `${row.name},${row.revenue}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Revenue Analytics</h3>
            <p className="text-xs text-zinc-500">Financial performance and category distribution</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <div className="flex gap-1">
            <button 
              onClick={handleExportCSV}
              className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Export CSV"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onExportData('pdf')}
              className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Export PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase">
              <TrendingUp className="w-4 h-4" />
              <span>+12.5% vs last period</span>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Category Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-4">
            {categoryData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-zinc-400">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-white">₹{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Rating Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Driver Rating Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} width={60} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Avg Rating</div>
              <div className="text-xl font-bold text-white">
                {(drivers.reduce((acc, d) => acc + d.rating, 0) / (drivers.length || 1)).toFixed(1)} ⭐
              </div>
            </div>
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total Drivers</div>
              <div className="text-xl font-bold text-white">{drivers.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Drivers Section */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Top Performing Drivers</h3>
          <button className="text-xs text-blue-500 hover:underline font-bold uppercase tracking-wider">View All Drivers</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {topDrivers.map((driver, i) => (
            <div key={driver.uid} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2">
                <div className="bg-blue-500/10 text-blue-500 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border border-blue-500/20">
                  #{i + 1}
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 mb-3 overflow-hidden">
                  {driver.profile?.photoURL ? (
                    <img src={driver.profile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                      {driver.profile?.displayName?.charAt(0) || 'D'}
                    </div>
                  )}
                </div>
                <div className="text-sm font-bold text-white mb-1 truncate w-full">{driver.profile?.displayName || 'Unknown'}</div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-3">{driver.vehicleId || 'Standard'}</div>
                <div className="w-full pt-3 border-t border-zinc-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-zinc-500">Earnings</span>
                    <span className="text-xs font-bold text-emerald-500">₹{driver.earnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500">Rides</span>
                    <span className="text-xs font-bold text-white">{driver.totalRides}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
