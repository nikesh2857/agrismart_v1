import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, ShoppingCart, Star, Plus, Trash2, ArrowLeft, UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { PageType, User } from '../types';
import { apiClient } from '../lib/apiClient';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sellerId: string;
  seller: { name: string };
  category?: string;
  // UI fields mocked
  unit?: string;
  image?: string;
  rating?: number;
}

interface MarketplaceProps {
  onNavigate?: (page: PageType) => void;
  cart: string[];
  setCart: (cart: string[]) => void;
  user: User;
}

export function Marketplace({ onNavigate, cart, setCart, user }: MarketplaceProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ products: any[] }>('/api/products');
      const mapped = data.products.map(p => ({
        ...p,
        unit: 'Quintal', // Mock unit
        rating: 4.5,
        image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=600' // Generic crop image fallback
      }));
      setProductList(mapped);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', price: '', unit: 'Quintal', stock: ''
  });
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCart = (id: string) => {
    setCart(cart.includes(id) ? cart.filter(item => item !== id) : [...cart, id]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      alert("Please fill in all required fields.");
      return;
    }
    
    try {
      await apiClient.post('/api/products', {
        name: newProduct.name,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        category: 'PRODUCE', // Defaulting to PRODUCE
        description: 'Quality goods from local farm'
      });
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: '', unit: 'Quintal', stock: '' });
      setNewImagePreview(null);
      loadProducts();
    } catch (err) {
      console.error('Failed to create product:', err);
      alert('Failed to list product.');
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;
    try {
      await apiClient.delete(`/api/products/${encodeURIComponent(productId)}`);
      setProductList(prev => prev.filter(p => p.id !== productId));
    } catch (err: any) {
      console.error('Failed to delete product via standard endpoint, trying admin route:', err);
      try {
        await apiClient.delete(`/api/admin/products/${encodeURIComponent(productId)}`);
        setProductList(prev => prev.filter(p => p.id !== productId));
      } catch (adminErr: any) {
        console.error('Failed to delete product via admin endpoint:', adminErr);
        alert(err.message || adminErr.message || 'Failed to delete product. Please try again.');
      }
    }
  };

  if (isAddingProduct) {
    return (
      <div className="space-y-6 pb-20 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsAddingProduct(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Add New Goods</h1>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Goods Name*</label>
              <input 
                type="text" 
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. Organic Tomatoes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Stock Available*</label>
              <input 
                type="number" 
                value={newProduct.stock}
                onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 50"
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
              <select 
                value={newProduct.unit}
                onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Quintal">Quintal</option>
                <option value="Kg">Kg</option>
                <option value="Ton">Ton</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Goods Image*</label>
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
              Add Goods
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isUserAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toUpperCase() === 'ADMIN';

  return (
    <div className="space-y-6 pb-20">
      {/* Header Tabs */}
      <div className="flex items-center justify-between">
        {user.role !== 'buyer' ? (
          <div className="flex p-1 bg-slate-200 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('buy')}
              className={cn("px-6 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'buy' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Buyer Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('sell')}
              className={cn("px-6 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'sell' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Farmer Dashboard (Sell)
            </button>
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-slate-800">Buyer Dashboard</h1>
        )}
        
        {activeTab === 'buy' && (
          <button 
            onClick={() => onNavigate?.('cart')}
            className="relative p-2.5 bg-white text-slate-700 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        )}
        
        {activeTab === 'sell' && (
          <button onClick={() => setIsAddingProduct(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl shadow-sm hover:bg-green-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            List New Product
          </button>
        )}
      </div>

      {activeTab === 'buy' && (
        <>
          {/* Search & Filter */}
          <div className="flex gap-4">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-sm border border-slate-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
              <Search className="w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search crops, seeds, or farm equipment..." 
                className="bg-transparent border-none focus:outline-none w-full text-slate-700"
              />
            </div>
            <button className="px-4 py-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <span className="font-medium hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {productList.map((product: any) => {
              const canDelete = isUserAdmin || user.id === product.sellerId;
              return (
                <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group relative flex flex-col">
                  <div className="h-48 overflow-hidden relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    
                    {/* Remove Button for Admin or Seller */}
                    {canDelete && (
                      <button 
                        onClick={(e) => handleDeleteProduct(product.id, product.name, e)}
                        className="absolute top-3 left-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors opacity-90 sm:opacity-0 group-hover:opacity-100 z-10"
                        title="Remove Goods"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold shadow-sm z-10">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {product.rating}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-slate-500">By {product.seller?.name || 'Local Farm'}</p>
                      <div className="flex items-center text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-bold ml-1">{product.rating}</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">{product.name}</h3>
                    <div className="mt-auto">
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <span className="text-xl font-bold text-green-700">₹{product.price}</span>
                          <span className="text-xs text-slate-500"> /{product.unit}</span>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Stock: {product.stock}</span>
                      </div>
                      <button 
                        onClick={() => toggleCart(product.id.toString())}
                        className={cn(
                          "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                          cart.includes(product.id.toString()) 
                            ? "bg-green-100 text-green-700 hover:bg-green-200" 
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                      >
                        {cart.includes(product.id.toString()) ? 'Added to Cart' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {loading ? (
              <div className="col-span-full py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading products...</p>
              </div>
            ) : productList.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-slate-500 font-medium">No products found matching your search.</p>
              </div>
            ) : null}
          </div>
        </>
      )}

      {activeTab === 'sell' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-1">Your Active Listings</h3>
              <p className="text-slate-500 text-sm">Manage your products and track orders.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">Stock Left</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {productList.filter((p: any) => isUserAdmin || p.sellerId === user.id).map((product: any) => (
                  <tr key={product.id} className="border-b border-slate-100">
                    <td className="py-4 px-4 font-bold text-slate-800">{product.name}</td>
                    <td className="py-4 text-slate-600">₹{product.price} / {product.unit}</td>
                    <td className="py-4 text-slate-600">{product.stock} {product.unit}</td>
                    <td className="py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Active</span></td>
                    <td className="py-4 flex items-center gap-3">
                      <button onClick={() => handleDeleteProduct(product.id, product.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove Listing">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {productList.filter((p: any) => isUserAdmin || p.sellerId === user.id).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">You haven't listed any products yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
