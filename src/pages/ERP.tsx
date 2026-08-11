import { useState, useEffect } from 'react';
import { Users, CalendarDays, IndianRupee, Map, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PageType } from '../types';
import { apiClient } from '../lib/apiClient';

interface FinData {
  month: string;
  income: number;
  expense: number;
}

interface PlotData {
  id: string;
  name: string;
  crop: string;
  status: string;
}

interface ERPDashboardData {
  farmArea: number;
  activeLaborers: number;
  nextAction: { name: string; timeText: string } | null;
  finData: FinData[];
  plots: PlotData[];
}

export function ERP({ onNavigate }: { onNavigate: (page: PageType) => void }) {
  const [data, setData] = useState<ERPDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const json = await apiClient.get<ERPDashboardData>('/api/erp/dashboard');
        setData(json);
      } catch (err) {
        console.error('Failed to fetch ERP data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!data) return <div>Failed to load data.</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">Active Laborers</h3>
                <p className="text-2xl font-bold text-slate-800">{data.activeLaborers}</p>
              </div>
            </div>
            <button onClick={() => onNavigate('manage-tasks')} className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-200">
              Manage Tasks
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                <Map className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">Total Farm Area</h3>
                <p className="text-2xl font-bold text-slate-800">{data.farmArea} Acres</p>
              </div>
            </div>
            <button onClick={() => onNavigate('plot-map')} className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-200">
              View Plot Map
            </button>
          </div>
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">Next Major Action</h3>
                {data.nextAction ? (
                  <>
                    <p className="text-base font-bold text-slate-800 mt-1">{data.nextAction.name}</p>
                    <p className="text-xs text-slate-500">{data.nextAction.timeText}</p>
                  </>
                ) : (
                  <p className="text-base font-medium text-slate-500 mt-1">No pending actions</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Financial Health</h3>
              <p className="text-sm text-slate-500">Income vs Expenses</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div> Income
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div> Expense
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            {data.finData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.finData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No financial records available.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Crop Planning Timeline */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-x-auto">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Crop Planning Timeline</h3>
        <div className="min-w-[700px]">
          <div className="flex text-xs font-semibold text-slate-400 mb-2 border-b border-slate-100 pb-2">
            <div className="w-1/4">Crop</div>
            <div className="w-3/4 flex justify-between">
              <span>Status</span>
            </div>
          </div>
          <div className="space-y-4 py-4">
            {data.plots.length > 0 ? (
              data.plots.map((plot, i) => {
                const colorClasses = [
                  { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-700' },
                  { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' },
                  { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' },
                  { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' }
                ];
                const c = colorClasses[i % colorClasses.length];
                
                return (
                  <div key={plot.id} className="flex items-center">
                    <div className="w-1/4 font-medium text-slate-700 text-sm">{plot.crop} ({plot.name})</div>
                    <div className="w-3/4 relative h-8 bg-slate-50 rounded-full border border-slate-100">
                      <div className={`absolute left-0 w-full h-full ${c.bg} border ${c.border} rounded-full flex items-center px-4 text-xs font-semibold ${c.text}`}>
                        {plot.status}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-slate-500 py-4">No active plots found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
