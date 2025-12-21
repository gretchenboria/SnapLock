/**
 * ASSET LIBRARY - Browsable 3D Model Catalog
 * Displays NVIDIA Omniverse and other 3D assets for ML training scenarios
 */

import React, { useState, useEffect } from 'react';
import { Package, Box, Cylinder, Search } from 'lucide-react';

export interface Asset {
  id: string;
  name: string;
  path?: string;
  geometry?: string;  // For procedural primitives
  category: string;
  physics_enabled: boolean;
  mass: number;
  friction: number;
  restitution: number;
  thumbnail?: string;
  tags: string[];
}

interface AssetLibraryProps {
  onAssetSelect: (asset: Asset) => void;
  onAssembleScene?: (assets: Asset[], layout: 'tabletop' | 'warehouse_shelf' | 'surgical_table' | 'grid' | 'pile') => void;
}

export function AssetLibrary({ onAssetSelect, onAssembleScene }: AssetLibraryProps) {
  const [assets, setAssets] = useState<Record<string, Asset[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLayout, setSelectedLayout] = useState<'tabletop' | 'warehouse_shelf' | 'surgical_table' | 'grid' | 'pile'>('tabletop');

  useEffect(() => {
    // Load asset registry
    fetch('/assets/asset_registry.json')
      .then(res => res.json())
      .then(data => {
        setAssets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load asset registry:', err);
        setLoading(false);
      });
  }, []);

  const categories = Object.keys(assets);

  const filteredAssets = () => {
    let allAssets: Asset[] = [];

    if (selectedCategory === 'all') {
      allAssets = Object.values(assets).flat();
    } else {
      allAssets = assets[selectedCategory] || [];
    }

    if (searchQuery) {
      allAssets = allAssets.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return allAssets;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'warehouse': return '[WH]';
      case 'industrial': return '[IND]';
      case 'robots': return '[BOT]';
      case 'furniture': return '[FURN]';
      case 'primitives': return '[BOX]';
      default: return '[DIR]';
    }
  };

  const getAssetIcon = (asset: Asset) => {
    if (asset.geometry) {
      switch (asset.geometry) {
        case 'sphere': return <Cylinder className="w-8 h-8 text-cyan-400" />;
        case 'box': return <Box className="w-8 h-8 text-cyan-400" />;
        case 'cylinder': return <Cylinder className="w-8 h-8 text-cyan-400" />;
        default: return <Box className="w-8 h-8 text-cyan-400" />;
      }
    }
    return <Package className="w-8 h-8 text-cyan-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-3"></div>
          <div className="text-sm text-gray-400">Loading asset library...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-10 pr-3 py-2 bg-black/40 border border-white/20 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/10 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-cyan-500 text-black'
              : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          ALL ({Object.values(assets).flat().length})
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedCategory === category
                ? 'bg-cyan-500 text-black'
                : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{getCategoryIcon(category)}</span>
            <span>{category.toUpperCase()}</span>
            <span className="text-[9px] opacity-70">({assets[category]?.length || 0})</span>
          </button>
        ))}
      </div>

      {/* Assemble Scene Button */}
      {onAssembleScene && filteredAssets().length > 0 && (
        <div className="p-3 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={selectedLayout}
              onChange={(e) => setSelectedLayout(e.target.value as any)}
              className="flex-1 px-3 py-2 bg-black/60 border border-white/20 rounded text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="tabletop">Tabletop Layout</option>
              <option value="warehouse_shelf">Warehouse Shelf</option>
              <option value="surgical_table">Surgical Table</option>
              <option value="grid">Grid Layout</option>
              <option value="pile">Pile/Clutter</option>
            </select>
          </div>
          <button
            onClick={() => onAssembleScene(filteredAssets(), selectedLayout)}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold rounded text-sm transition-all transform hover:scale-[1.02]"
          >
            ASSEMBLE SCENE ({filteredAssets().length} assets)
          </button>
        </div>
      )}

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {filteredAssets().map(asset => (
            <button
              key={asset.id}
              onClick={() => onAssetSelect(asset)}
              className="group relative bg-black/60 border border-white/20 rounded-lg p-3 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
              title={`${asset.name}\nMass: ${asset.mass}kg\nFriction: ${asset.friction}\nRestitution: ${asset.restitution}`}
            >
              {/* Thumbnail/Icon */}
              <div className="aspect-square bg-black/40 rounded flex items-center justify-center mb-2 group-hover:bg-cyan-500/20 transition-colors">
                {getAssetIcon(asset)}
              </div>

              {/* Asset Name */}
              <div className="text-xs font-bold text-white text-center mb-1 line-clamp-2 group-hover:text-cyan-300">
                {asset.name}
              </div>

              {/* Physics Badge */}
              {asset.physics_enabled && (
                <div className="absolute top-1 right-1 bg-green-500/30 border border-green-400/50 rounded px-1.5 py-0.5">
                  <span className="text-[8px] font-bold text-green-300">PHYSICS</span>
                </div>
              )}

              {/* Category Badge */}
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded text-gray-400">
                  {asset.category}
                </span>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 border-2 border-cyan-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </button>
          ))}
        </div>

        {filteredAssets().length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div className="text-sm">No assets found</div>
            <div className="text-xs mt-1">Try a different search or category</div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="p-2 border-t border-white/10 bg-black/40">
        <div className="flex items-center justify-between text-[9px] text-gray-400">
          <span>{filteredAssets().length} assets shown</span>
          <span className="text-cyan-400 font-bold">Click to add to scene</span>
        </div>
      </div>
    </div>
  );
}
