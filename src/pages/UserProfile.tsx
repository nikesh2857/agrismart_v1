import { useState } from 'react';
import { User as UserIcon, Mail, Phone, CalendarDays, ShieldCheck, Loader2 } from 'lucide-react';
import { User } from '../types';
import { apiClient } from '../lib/apiClient';

interface UserProfileProps {
  user: User;
  onUpdateUser: (updatedUser: Partial<User>) => void;
}

export function UserProfile({ user, onUpdateUser }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [phone, setPhone] = useState(user.phone || '');
  const [place, setPlace] = useState((user as any).place || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const data = await apiClient.postForm('/api/auth/profile/upload', formData);
      if (data && data.url) {
        setAvatar(data.url);
      } else {
        throw new Error('Upload response did not contain image URL.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await apiClient.patch('/api/auth/profile', {
        name,
        avatarUrl: avatar,
        phone,
        place
      });

      if (data.user) {
        onUpdateUser({
          name: data.user.name,
          avatar: data.user.avatarUrl || '',
          phone: data.user.phone || '',
          place: data.user.place || ''
        } as any);
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      
      {/* User Info Card */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-green-100 text-green-700 rounded-full flex items-center justify-center ring-4 ring-green-50 shadow-md mb-6 relative overflow-hidden group">
          {uploading ? (
            <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            </div>
          ) : avatar ? (
            <img src={avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-12 h-12" />
          )}
          
          {isEditing && !uploading && (
            <label 
              htmlFor="file-upload" 
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Photo</span>
              <input 
                id="file-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          )}
          {!isEditing && (
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-green-600" />
            </div>
          )}
        </div>
        
        {isEditing ? (
          <form onSubmit={handleSave} className="w-full space-y-4 text-left">
            <div>
              <label htmlFor="name-input" className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-slate-700"
              />
            </div>

            <div>
              <label htmlFor="phone-input" className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
              <input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-slate-700"
              />
            </div>

            <div>
              <label htmlFor="place-input" className="block text-xs font-semibold text-slate-500 mb-1">Place / Location</label>
              <input
                id="place-input"
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g. Guntur, Andhra Pradesh"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-slate-700"
              />
            </div>

            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setName(user.name);
                  setAvatar(user.avatar);
                  setPhone(user.phone || '');
                  setPlace((user as any).place || '');
                  setIsEditing(false);
                  setError('');
                }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors focus:outline-none flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
            <p className="text-sm font-semibold text-green-600 uppercase tracking-wider mt-1 mb-6">
              {user.role === 'buyer' ? 'Customer' : user.role} Account
            </p>
            
            {success && <p className="text-xs text-green-600 font-semibold mb-4">{success}</p>}

            <div className="w-full space-y-4 text-left">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700">{user.email || 'Email not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Phone Number</p>
                  <p className="text-sm font-semibold text-slate-700">{user.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <CalendarDays className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Place / Location</p>
                  <p className="text-sm font-semibold text-slate-700">{(user as any).place || 'Not specified'}</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setIsEditing(true)}
              aria-label="Edit Profile Details"
              className="mt-6 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              Edit Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
