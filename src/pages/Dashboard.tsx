import { useState, useEffect, FormEvent } from 'react';
import { Sun, Droplets, Wind, TrendingUp, TrendingDown, ArrowRight, Sprout, CloudRain, MapPin, Loader2, Pencil, Cloud, CloudLightning, Snowflake, Users, StickyNote, Trash2, Plus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PageType } from '../types';
import { apiClient } from '../lib/apiClient';

interface LiveWorkerData {
  travelling: number;
  arrived: number;
  working: number;
  finished: number;
}



const priceData = [
  { name: 'Mon', price: 2100 },
  { name: 'Tue', price: 2150 },
  { name: 'Wed', price: 2080 },
  { name: 'Thu', price: 2200 },
  { name: 'Fri', price: 2350 },
  { name: 'Sat', price: 2300 },
];



const WeatherIcon = ({ main, className }: { main?: string; className?: string }) => {
  switch (main) {
    case 'Clear':
      return <Sun className={`${className} text-yellow-300`} />;
    case 'Clouds':
      return <Cloud className={`${className} text-blue-100`} />;
    case 'Rain':
    case 'Drizzle':
      return <CloudRain className={`${className} text-blue-300`} />;
    case 'Thunderstorm':
      return <CloudLightning className={`${className} text-purple-300`} />;
    case 'Snow':
      return <Snowflake className={`${className} text-sky-200`} />;
    default:
      return <Cloud className={`${className} text-white`} />;
  }
};

export function Dashboard({ onNavigate }: { onNavigate?: (page: PageType) => void }) {
  const [locationName, setLocationName] = useState('New Delhi');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editLocationInput, setEditLocationInput] = useState('');
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [liveWorkers, setLiveWorkers] = useState<LiveWorkerData | null>(null);
  
  const [weatherData, setWeatherData] = useState<{
    temp: number;
    humidity: number;
    windSpeed: number;
    description: string;
    isRaining: boolean;
    main?: string;
    forecast: { day: string; temp: number | string; isRaining: boolean; main?: string }[];
  } | null>(null);

  // Note Pad State
  const [notes, setNotes] = useState<string[]>(() => {
    const saved = localStorage.getItem('farmer_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [noteInput, setNoteInput] = useState('');

  // Persist notes to localStorage
  useEffect(() => {
    localStorage.setItem('farmer_notes', JSON.stringify(notes));
  }, [notes]);

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    if (noteInput.trim()) {
      setNotes(prev => [...prev, noteInput.trim()]);
      setNoteInput('');
    }
  };

  const handleRemoveNote = (index: number) => {
    setNotes(prev => prev.filter((_, i) => i !== index));
  };

  // Crop Management States
  const [crops, setCrops] = useState<{ name: string; status: 'Healthy' | 'Attention'; progress: number; nextAction: string }[]>(() => {
    const saved = localStorage.getItem('farmer_crops');
    if (saved) return JSON.parse(saved);
    return [
      { name: 'Wheat', status: 'Healthy', progress: 75, nextAction: 'Irrigation in 2 days' },
      { name: 'Rice', status: 'Attention', progress: 40, nextAction: 'Check pest infestation' },
      { name: 'Corn', status: 'Healthy', progress: 90, nextAction: 'Harvesting next week' },
    ];
  });
  const [isAddingCrop, setIsAddingCrop] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropStatus, setNewCropStatus] = useState<'Healthy' | 'Attention'>('Healthy');
  const [newCropProgress, setNewCropProgress] = useState(50);
  const [newCropAction, setNewCropAction] = useState('');

  // Persist crops to localStorage
  useEffect(() => {
    localStorage.setItem('farmer_crops', JSON.stringify(crops));
  }, [crops]);

  const handleAddCrop = (e: FormEvent) => {
    e.preventDefault();
    if (newCropName.trim() && newCropAction.trim()) {
      setCrops(prev => [...prev, {
        name: newCropName.trim(),
        status: newCropStatus,
        progress: newCropProgress,
        nextAction: newCropAction.trim()
      }]);
      resetAddCropForm();
    }
  };

  const handleRemoveCrop = (index: number) => {
    setCrops(prev => prev.filter((_, i) => i !== index));
  };

  const resetAddCropForm = () => {
    setIsAddingCrop(false);
    setNewCropName('');
    setNewCropStatus('Healthy');
    setNewCropProgress(50);
    setNewCropAction('');
  };

  // Market Trends Graph States
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [priceHistory, setPriceHistory] = useState<{ date: string; price: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const data = await apiClient.get(`/api/market-rates/history?crop=${selectedCrop}`);
        setPriceHistory(data);
      } catch (err) {
        console.error('Failed to load market trends history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [selectedCrop]);

  // Contacts Slot States
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string; avatarUrl?: string; jobName: string; role: string }[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    const loadContacts = async () => {
      setLoadingContacts(true);
      try {
        const data = await apiClient.get<typeof contacts>('/api/erp/contacts');
        setContacts(data);
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        setLoadingContacts(false);
      }
    };
    loadContacts();
    
    const contactsInterval = setInterval(loadContacts, 15000);
    return () => clearInterval(contactsInterval);
  }, []);

  const loadWeatherForCoords = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.locationName) setLocationName(data.locationName);
      setWeatherData(data);
    } catch (error) {
      console.error("Weather fetch failed", error);
    } finally {
      setLoadingWeather(false);
    }
  };

  const loadWeatherDataByName = async (query: string) => {
    setLoadingWeather(true);
    try {
      const response = await fetch(`/api/weather?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.locationName) setLocationName(data.locationName);
      setWeatherData(data);
    } catch (error) {
      console.error("Location search failed", error);
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    loadWeatherDataByName('New Delhi');
    
    // Live worker tracking
    const loadWorkers = async () => {
      try {
        const data = await apiClient.get<LiveWorkerData>('/api/erp/workers/live');
        setLiveWorkers(data);
      } catch (err) {
        console.error('Failed to load live workers:', err);
      }
    };
    
    loadWorkers();
    const workerInterval = setInterval(loadWorkers, 10000);
    return () => clearInterval(workerInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetLiveLocation = () => {
    setLoadingWeather(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setLocationName('Live Location');
          await loadWeatherForCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error(error);
          setLocationName('Location Access Denied');
          setLoadingWeather(false);
        }
      );
    } else {
      setLoadingWeather(false);
    }
  };

  const handleLocationSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editLocationInput.trim()) {
      setLocationName(editLocationInput.trim());
      loadWeatherDataByName(editLocationInput.trim());
    }
    setIsEditingLocation(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top row: Weather & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Weather Widget */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
            <Sun className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  {isEditingLocation ? (
                    <form onSubmit={handleLocationSubmit} className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-100" />
                      <input 
                        autoFocus
                        value={editLocationInput}
                        onChange={(e) => setEditLocationInput(e.target.value)}
                        onBlur={() => {
                          // Optional: submit on blur or just cancel. We'll cancel on blur if they click away.
                          // To avoid race conditions with submit, we can just use timeout or let form handle it.
                          setTimeout(() => setIsEditingLocation(false), 150);
                        }}
                        className="bg-white/20 text-white placeholder-blue-200 outline-none rounded px-2 py-1 text-sm w-40 border border-white/30 focus:border-white focus:bg-white/30 transition-colors"
                        placeholder="Enter location"
                      />
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h3 className="text-blue-100 font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> {locationName}
                      </h3>
                      <button
                        onClick={() => {
                          setEditLocationInput(locationName.replace('Live: ', ''));
                          setIsEditingLocation(true);
                        }}
                        className="text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none rounded p-1"
                        aria-label="Edit location"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleGetLiveLocation}
                    disabled={loadingWeather}
                    aria-label="Use Live Location"
                    className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white flex items-center gap-2 ml-1"
                  >
                    {loadingWeather ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Get Live'}
                  </button>
                </div>
                
                <div className="text-5xl font-bold mt-2 flex items-center gap-4">
                  {weatherData ? weatherData.temp : '--'}°C 
                  <WeatherIcon main={weatherData?.main} className="w-10 h-10 drop-shadow-md" />
                </div>
                <p className="text-blue-100 mt-1">{weatherData ? weatherData.description : 'Loading...'}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex gap-6">
                <div className="text-center">
                  <Droplets className="w-6 h-6 mx-auto text-blue-200 mb-1" />
                  <p className="text-sm font-semibold">{weatherData ? weatherData.humidity : '--'}%</p>
                  <p className="text-xs text-blue-200">Humidity</p>
                </div>
                <div className="text-center">
                  <Wind className="w-6 h-6 mx-auto text-blue-200 mb-1" />
                  <p className="text-sm font-semibold">{weatherData ? weatherData.windSpeed : '--'} km/h</p>
                  <p className="text-xs text-blue-200">Wind</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-white/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-100 mb-3">5-Day Forecast</h4>
              <div className="flex justify-between gap-2">
                {(weatherData?.forecast || Array(5).fill({ day: '-', temp: '-', isRaining: false })).map((forecast, i) => (
                  <div key={i} className="text-center bg-white/10 rounded-xl py-2 px-3 flex-1 backdrop-blur-sm">
                    <p className="text-xs text-blue-100 mb-1 font-medium">{forecast.day}</p>
                    <WeatherIcon main={forecast.main} className="w-5 h-5 mx-auto" />
                    <p className="text-sm font-bold mt-1">{forecast.temp}°</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Note Pad */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full min-h-[340px]">
          <div className="flex items-center gap-2 mb-4 text-slate-800 border-b border-slate-100 pb-2">
            <StickyNote className="w-5 h-5 text-green-600 animate-bounce" />
            <h3 className="font-semibold text-slate-800 text-base">Quick Farm Notes</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4 scrollbar-thin max-h-[220px]">
            {notes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-6">
                <p className="text-sm">No notes added yet.</p>
                <p className="text-xs mt-1">Write down tasks or ideas below.</p>
              </div>
            ) : (
              notes.map((note, index) => (
                <div 
                  key={index} 
                  className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-100 group hover:bg-amber-50 transition-colors"
                >
                  <p className="text-sm text-slate-700 font-medium break-words whitespace-pre-wrap flex-1">{note}</p>
                  <button 
                    onClick={() => handleRemoveNote(index)}
                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                    title="Remove note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2 mt-auto">
            <input 
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add a new note..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-slate-700"
            />
            <button 
              type="submit"
              disabled={!noteInput.trim()}
              className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>



      {/* Third Row: Live Worker Fleet & Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Worker Fleet */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" /> Live Worker Fleet
              </h3>
              <button onClick={() => onNavigate?.('book-workers')} aria-label="Manage Workers" className="text-blue-600 text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1">Manage Workers</button>
            </div>
            
            {liveWorkers ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <p className="text-sm font-medium text-blue-700 mb-1">Travelling</p>
                  <p className="text-3xl font-bold text-blue-800">{liveWorkers.travelling}</p>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                  <p className="text-sm font-medium text-purple-700 mb-1">Arrived</p>
                  <p className="text-3xl font-bold text-purple-800">{liveWorkers.arrived}</p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-sm font-medium text-amber-700 mb-1">Working</p>
                  <p className="text-3xl font-bold text-amber-800">{liveWorkers.working}</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                  <p className="text-sm font-medium text-green-700 mb-1">Finished</p>
                  <p className="text-3xl font-bold text-green-800">{liveWorkers.finished}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                <p>Loading worker locations...</p>
              </div>
            )}
          </div>
        </div>

        {/* Contacts Slot */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[230px] lg:h-auto min-h-[200px]">
          <div className="flex items-center gap-2 mb-4 text-slate-800 border-b border-slate-100 pb-2">
            <span className="text-2xl">📞</span>
            <h3 className="font-semibold text-slate-800 text-base">Active Contacts</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {loadingContacts ? (
              <div className="h-full flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-green-600 mr-2" />
                <span className="text-xs">Loading contacts...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-6">
                <p className="text-sm font-medium">No contacts yet.</p>
                <p className="text-xs mt-0.5">Contacts appear once worker requests are accepted.</p>
              </div>
            ) : (
              contacts.map((contact, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100 transition-all">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm shrink-0 border border-green-200">
                    {contact.avatarUrl ? (
                      <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      contact.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{contact.name}</h4>
                    <a href={`mailto:${contact.email}`} className="text-xs text-green-600 hover:underline truncate block" title={contact.email}>
                      {contact.email}
                    </a>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                      {contact.role}
                    </span>
                    <span className="block text-[9px] text-slate-400 truncate max-w-[80px] mt-0.5" title={contact.jobName}>
                      {contact.jobName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
