import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, MapPin, Star, Plus, Trash2, ArrowLeft, UploadCloud, ShoppingCart } from 'lucide-react';
import organicHoneyImg from '../assets/images/organic_honey_1784352178761.jpg';
import { PageType, User } from '../types';

interface OrganicMarketProps {
  user?: User;
  onNavigate?: (page: PageType) => void;
  cart?: string[];
  setCart?: (cart: string[]) => void;
}

const initialOrganicProducts = [
  { id: 'organic-1', name: 'Certified Organic Turmeric', farmer: 'Prakriti Farms', location: 'Kerala, India', cert: 'India Organic, USDA', price: 1200, unit: '10kg', image: 'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=400&q=80', sellerId: 'admin' },
  { id: 'organic-2', name: 'Pesticide-Free Honey', farmer: 'WildBee Collective', location: 'Himachal Pradesh', cert: 'India Organic', price: 850, unit: '1kg', image: organicHoneyImg, sellerId: 'admin' },
  { id: 'organic-3', name: 'Heirloom Tomatoes', farmer: 'Earth Roots', location: 'Maharashtra', cert: 'PGS-India', price: 150, unit: '1kg', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80', sellerId: 'admin' },
];

export function OrganicMarket({ user, onNavigate, cart = [], setCart }: OrganicMarketProps) {
  const [productList, setProductList] = useState(() => {
    const saved = localStorage.getItem('organicProducts');
    if (saved) {
      let parsed = JSON.parse(saved);
      parsed = parsed.map((p: any) => 
        p.id === 'organic-2' || p.id === 2 ? { ...p, image: organicHoneyImg } : p
      );
      return parsed;
    }
    return initialOrganicProducts;
  });

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', farmer: '', location: '', cert: '', price: '', unit: '1kg'
  });
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('organicProducts', JSON.stringify(productList));
  }, [productList]);

  const handleAddToCart = (productId: string, productName: string) => {
    if (setCart) {
      setCart([...cart, productId]);
      alert(`Added "${productName}" to cart!`);
    }
  };

  const handleBuyNow = (productId: string, productName: string) => {
    if (setCart) {
      setCart([...cart, productId]);
    }
    if (onNavigate) {
      onNavigate('cart');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSaveProduct = () => {
    if (!newProduct.name || !newProduct.price || !newImagePreview) {
      alert("Please fill in required fields and upload an image.");
      return;
    }
    
    const newItem = {
      id: Date.now(),
      name: newProduct.name,
      farmer: newProduct.farmer || user?.name || 'Unknown Farmer',
      sellerId: user?.id,
      location: newProduct.location || 'Local',
      cert: newProduct.cert || 'Self Certified',
      price: Number(newProduct.price),
      unit: newProduct.unit,
      image: newImagePreview,
    };

    setProductList((prev: any) => [...prev, newItem]);
    setIsAddingProduct(false);
    setNewProduct({ name: '', farmer: '', location: '', cert: '', price: '', unit: '1kg' });
    setNewImagePreview(null);
  };

  if (isAddingProduct) {
    return (
      <div className="space-y-6 pb-20 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsAddingProduct(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Add Organic Product</h1>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Product Name*</label>
              <input 
                type="text" 
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. Organic Tomatoes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Farmer/Farm Name</label>
              <input 
                type="text" 
                value={newProduct.farmer}
                onChange={e => setNewProduct({...newProduct, farmer: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. Green Acres"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
              <input 
                type="text" 
                value={newProduct.location}
                onChange={e => setNewProduct({...newProduct, location: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. Maharashtra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Certifications</label>
              <input 
                type="text" 
                value={newProduct.cert}
                onChange={e => setNewProduct({...newProduct, cert: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. India Organic"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Price*</label>
              <input 
                type="number" 
                value={newProduct.price}
                onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 1200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
              <input 
                type="text" 
                value={newProduct.unit}
                onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 1kg, 10kg, Dozen"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Product Image*</label>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden group relative"
            >
              {newImagePreview ? (
                <img src={newImagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-500 group-hover:text-green-600 transition-colors">
                  <UploadCloud className="w-8 h-8 mb-2" />
                  <span className="font-medium">Click to upload image</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              onClick={handleSaveProduct}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-colors"
            >
              Add Product
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Organic Market</h1>
        {(user?.role === 'admin' || user?.role === 'farmer') && (
          <button 
            onClick={() => setIsAddingProduct(true)}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium shadow-sm hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        )}
      </div>

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden h-64 flex items-center justify-center text-center">
        <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80" alt="Organic Farm" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-green-900/60 mix-blend-multiply"></div>
        <div className="relative z-10 p-8 max-w-2xl text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 backdrop-blur-md rounded-full text-green-100 text-sm font-semibold mb-4 border border-green-400/30">
            <ShieldCheck className="w-4 h-4" /> 100% Certified Organic
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Direct from Conscious Farmers</h1>
          <p className="text-green-50">Support sustainable agriculture and buy verified pesticide-free produce directly from certified organic growers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productList.map((p: any) => (
          <div key={p.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group flex flex-col relative">
            <div className="h-56 relative overflow-hidden">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {p.cert.split(',')[0]}
                </span>
              </div>
              
              {/* Remove Button */}
              {(user?.role === 'admin' || user?.id === p.sellerId) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setProductList((prev: any) => prev.filter((item: any) => item.id !== p.id));
                  }}
                  className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors opacity-0 group-hover:opacity-100 z-10"
                  title="Remove Product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
                <MapPin className="w-3 h-3" /> {p.location}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{p.name}</h3>
              <p className="text-sm text-green-700 font-medium mb-4">Grown by {p.farmer}</p>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 gap-2">
                <div>
                  <span className="text-2xl font-bold text-slate-800">₹{p.price}</span>
                  <span className="text-sm text-slate-500">/{p.unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAddToCart(String(p.id), p.name)}
                    className="p-2.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleBuyNow(String(p.id), p.name)}
                    className="px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
