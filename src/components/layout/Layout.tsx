import { ReactNode, useState } from 'react';
import { TranslateWidget } from '../TranslateWidget';
import { Sidebar } from './Sidebar';
import { ChatbotFAB } from './ChatbotFAB';
import { PageType, User } from '../../types';
import { Bell, User as UserIcon, Search, LogOut, Globe, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../hooks/useNotifications';

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

interface LayoutProps {
  children: ReactNode;
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  user: User;
  onLogout: () => void;
  cart?: string[];
}

export function Layout({ children, currentPage, setCurrentPage, user, onLogout, cart = [] }: LayoutProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user);
  const [showNotifications, setShowNotifications] = useState(false);

  const pageTitles: Record<PageType, string> = {
    'dashboard': 'Smart Farmer Portal',
    'marketplace': 'Online Agricultural Marketplace',
    'erp': 'Farm Map',
    'disease': 'Crop Disease Detection',
    'organic': 'Organic Farming Marketplace',
    'fertilizer': 'Fertilizer Recommendation',
    'seed': 'Seed Recommendation',
    'schemes': 'Government Schemes',
    'ai-assistant': 'AI Crop Assistant',
    'rental': 'Equipment Rental & Analytics',
    'profile': 'User Profile',
    'cart': 'Shopping Cart',
    'manage-tasks': 'Manage Tasks',
    'plot-map': 'Plot Map',
    'market-rates': 'Market Rates',
    'admin-bookings': 'Admin Bookings',
    'book-workers': 'Book Workers',
    'worker-jobs': 'Work Dashboard',
  };

  const totalCartCount = Array.isArray(cart) ? cart.length : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 font-sans">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} user={user} />
      
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-6 flex-1">
            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
              {pageTitles[currentPage]}
            </h2>
            
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-transparent focus-within:border-slate-300 focus-within:bg-white transition-all max-w-md w-full ml-8">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search across ecosystem..." 
                className="bg-transparent border-none focus:outline-none text-sm w-full"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-5 ml-4">
            <div className="flex items-center">
              <TranslateWidget id="google_translate_element" />
            </div>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setCurrentPage('cart')}
              title="Shopping Cart"
              aria-label="Shopping Cart"
              className="relative p-2.5 text-slate-600 hover:text-slate-900 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {totalCartCount}
                </span>
              )}
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-full hover:bg-slate-100 border border-slate-200"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-semibold text-slate-800">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => markAllRead()}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                          No notifications yet
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {notifications.map(n => (
                            <div key={n.id} className={`p-4 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-green-50/30 cursor-pointer' : ''}`} onClick={() => !n.read && markRead([n.id])}>
                              <p className="font-medium text-sm text-slate-800">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{n.body}</p>
                              <p className="text-[10px] text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setCurrentPage('profile')}
              aria-label="View user profile"
              className="flex items-center gap-3 pl-5 border-l border-slate-200 hover:bg-slate-50 px-2 py-1 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <div className="flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</span>
                <span className="text-[11px] text-slate-500 capitalize font-medium">{user.role === 'buyer' ? 'customer' : user.role}</span>
              </div>
              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-semibold ring-2 ring-white shadow-sm">
                <UserIcon className="w-5 h-5" />
              </div>
            </button>
            <button 
              onClick={onLogout}
              aria-label="Logout"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-8 max-w-[1400px] mx-auto min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ChatbotFAB />
    </div>
  );
}
