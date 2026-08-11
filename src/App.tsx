import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { PageType, User } from './types';
import { supabase } from './lib/supabase';

// Page Imports
import { Dashboard } from './pages/Dashboard';
import { Marketplace } from './pages/Marketplace';
import { ERP } from './pages/ERP';
import { Disease } from './pages/Disease';
import { OrganicMarket } from './pages/OrganicMarket';
import { Fertilizer } from './pages/Fertilizer';
import { Seed } from './pages/Seed';
import { Schemes } from './pages/Schemes';
import { AIAssistant } from './pages/AIAssistant';
import { Rental } from './pages/Rental';
import { Home } from './pages/Home';
import { UserProfile } from './pages/UserProfile';
import { Cart } from './pages/Cart';
import { ManageTasks } from './pages/ManageTasks';
import { PlotMap } from './pages/PlotMap';
import { MarketRates } from './pages/MarketRates';
import { AdminBookings } from './pages/AdminBookings';
import { BookWorkers } from './pages/BookWorkers';
import { WorkerJobs } from './pages/WorkerJobs';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    const saved = localStorage.getItem('current_page');
    return (saved as PageType) || 'dashboard';
  });
  const [cart, setCart] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync current page to localStorage
  useEffect(() => {
    if (currentPage) {
      localStorage.setItem('current_page', currentPage);
    }
  }, [currentPage]);

  // Restore user session on load / auth change
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken === 'admin_hardcoded_token_123') {
      setUser({
        id: 'admin-1',
        name: 'System Admin',
        role: 'admin',
        avatar: ''
      });
      setLoading(false);
      return;
    }

    const phoneUser = localStorage.getItem('phone_user');
    if (phoneUser) {
      setUser(JSON.parse(phoneUser));
      setLoading(false);
      return;
    }

    // Subscribe to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          const idToken = session.access_token;
          const storedRole = localStorage.getItem('selected_role') || 'FARMER';
          
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ role: storedRole.toUpperCase() })
          }).catch(() => null);
          
          if (res && res.ok) {
            const data = await res.json();
            setUser({
              id: session.user.id,
              name: data.user.name || session.user.user_metadata?.full_name || 'User',
              role: data.user.role.toLowerCase() as any,
              avatar: data.user.avatarUrl || session.user.user_metadata?.avatar_url || '',
              phone: data.user.phone || ''
            });
          } else {
            const storedRole = localStorage.getItem('selected_role') || 'farmer';
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              role: (storedRole.toLowerCase() as any) || 'farmer',
              avatar: session.user.user_metadata?.avatar_url || '',
              phone: ''
            });
          }
        } catch (err) {
          console.error("Error restoring Supabase session:", err);
          setUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'marketplace': return <Marketplace onNavigate={setCurrentPage} cart={cart} setCart={setCart} user={user!} />;
      case 'erp': return <PlotMap />;
      case 'disease': return <Disease />;
      case 'organic': return <OrganicMarket user={user!} onNavigate={setCurrentPage} cart={cart} setCart={setCart} />;
      case 'fertilizer': return <Fertilizer />;
      case 'seed': return <Seed />;
      case 'schemes': return <Schemes />;
      case 'ai-assistant': return <AIAssistant onNavigate={setCurrentPage} />;
      case 'rental': return <Rental user={user!} />;
      case 'profile': return <UserProfile user={user!} onUpdateUser={(updatedUser) => setUser(prev => prev ? { ...prev, ...updatedUser } : null)} />;
      case 'cart': return <Cart onNavigate={setCurrentPage} cart={cart} setCart={setCart} />;
      case 'manage-tasks': return <ManageTasks onNavigate={setCurrentPage} user={user!} />;
      case 'plot-map': return <PlotMap onNavigate={setCurrentPage} />;
      case 'market-rates': return <MarketRates onNavigate={setCurrentPage} />;
      case 'admin-bookings': return <AdminBookings />;
      case 'book-workers': return <BookWorkers user={user!} />;
      case 'worker-jobs': return <WorkerJobs user={user!} />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    if (newUser.role === 'admin') {
      setCurrentPage('admin-bookings');
    } else if (newUser.role === 'worker') {
      setCurrentPage('worker-jobs');
    } else if (newUser.role === 'buyer') {
      setCurrentPage('marketplace');
    } else {
      setCurrentPage('dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        <p className="mt-4 text-slate-600 font-medium">Restoring session...</p>
      </div>
    );
  }

  if (!user) {
    return <Home onLogin={handleLogin} />;
  }

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage} user={user} onLogout={async () => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('phone_user');
      localStorage.removeItem('current_page');
      localStorage.removeItem('selected_role');
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase signout failed", err);
      }
      setUser(null);
      setCurrentPage('dashboard');
    }}>
      {renderPage()}
    </Layout>
  );
}
