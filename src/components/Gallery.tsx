/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SavedTactic } from '../types';
import { ArrowLeft, Trash2, Calendar, Layers, FolderOpen, Play, Search, AlertCircle } from 'lucide-react';

interface GalleryProps {
  savedTactics: SavedTactic[];
  onSelectTactic: (tactic: SavedTactic) => void;
  onDeleteTactic: (id: string) => void;
  onBackToHome: () => void;
}

export default function Gallery({ savedTactics, onSelectTactic, onDeleteTactic, onBackToHome }: GalleryProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTactics = savedTactics.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.mapName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white scanlines font-sans pb-16">
      
      {/* HEADER BAR */}
      <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={onBackToHome}
          className="flex items-center space-x-2 text-xs font-mono font-bold tracking-widest text-[#FF4655] hover:text-white transition duration-150 uppercase"
        >
          <ArrowLeft size={14} />
          <span>MAP GALLERY</span>
        </button>

        <div className="text-right">
          <h1 className="font-rajdhani font-bold tracking-widest text-lg text-white leading-none">SAVED STRATEGIES HUB</h1>
          <p className="text-[9px] font-mono text-gray-500 tracking-widest uppercase">LOCAL BROWSER STORAGE</p>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-6 mt-10">
        
        {/* TOP INTRO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-6 mb-8 gap-4">
          <div>
            <h2 className="font-rajdhani text-3xl font-black tracking-tight leading-none text-white uppercase select-none">
              STRATEGY <span className="text-[#FF4655]">HUB</span>
            </h2>
            <p className="mt-2 text-xs text-gray-400 font-mono">
              MANAGE TACTICAL OVERLAYS AND STRATEGY RELEASES
            </p>
          </div>

          {/* SEARCH */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="FILTER TACTICS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none pl-9 pr-4 py-2 text-xs font-mono tracking-wider rounded-none"
            />
          </div>
        </div>

        {/* LIST TACTICS */}
        {savedTactics.length === 0 ? (
          <div className="py-24 text-center max-w-lg mx-auto border border-dashed border-white/5 p-8 bg-[#0F1215]">
            <FolderOpen size={36} className="mx-auto text-gray-600 mb-4" />
            <h3 className="font-rajdhani text-lg font-bold tracking-widest text-gray-300 uppercase mb-2">NO STORED TACTICS FOUND</h3>
            <p className="text-xs text-gray-500 font-mono leading-relaxed mb-6">
              No tactics saved. Choose a map from the library to begin designing your strategy.
            </p>
            <button 
              onClick={onBackToHome}
              className="px-6 py-2 bg-[#FF4655] text-black font-mono text-xs font-bold tracking-widest hover:bg-[#FF4655]/95 transition duration-150 rounded-none val-miter-btn cursor-pointer"
            >
              CHOOSE MAP
            </button>
          </div>
        ) : filteredTactics.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-white/5">
            <AlertCircle size={24} className="mx-auto text-gray-600 mb-2" />
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">NO TACTICS MATCHING FILTER CRITERIA</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTactics.map((tactic) => (
              <div 
                key={tactic.id}
                className="bg-[#0F1215] border border-white/5 hover:border-[#FF4655]/50 transition-all duration-200 p-5 flex flex-col justify-between rounded-none shadow-md group"
              >
                <div>
                  {/* Map Header with Splash and name */}
                  <div className="relative h-28 bg-[#161A1E] border border-white/5 overflow-hidden mb-4 rounded-none">
                    <div 
                      className="absolute inset-0 bg-cover bg-center grayscale opacity-25 group-hover:opacity-40 transition-opacity duration-300"
                      style={{ backgroundImage: `url(${tactic.mapSplash})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F1215] to-transparent" />
                    
                    {/* Map badge details */}
                    <div className="absolute bottom-2 left-3 z-10">
                      <span className="text-[8px] font-mono text-gray-500 tracking-widest">DEPLOYMENT MAP</span>
                      <h4 className="font-rajdhani font-black text-xl text-white uppercase leading-none">
                        {tactic.mapName}
                      </h4>
                    </div>

                    <div className="absolute top-2 right-3 z-10 bg-black/60 border border-white/15 px-1.5 py-0.5 rounded-sm">
                      <span className="text-[8px] font-mono text-[#00F0FF] font-bold tracking-widest uppercase">
                        {tactic.slides.length} {tactic.slides.length > 1 ? 'SLIDES' : 'SLIDE'}
                      </span>
                    </div>
                  </div>

                  {/* Strategy Info */}
                  <div className="space-y-1.5">
                    <h3 className="font-rajdhani text-lg font-bold text-white tracking-wide truncate group-hover:text-[#FF4655] transition duration-150 uppercase">
                      {tactic.name}
                    </h3>
                    
                    <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-mono">
                      <Calendar size={10} />
                      <span>EDITED: {formatDate(tactic.updatedAt)}</span>
                    </div>

                    {/* Description preview */}
                    <p className="text-xs text-gray-400 font-mono h-12 overflow-hidden text-ellipsis line-clamp-3 bg-[#161A1E]/40 p-2 border border-white/5 rounded-none mt-3">
                      {tactic.notes ? tactic.notes : 'No strategy notes recorded for this map.'}
                    </p>
                  </div>
                </div>

                {/* Operations Buttons */}
                <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                  <button 
                    onClick={() => onDeleteTactic(tactic.id)}
                    className="p-2 border border-white/5 hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-400 transition duration-150 rounded-none text-gray-500 active:scale-95 cursor-pointer"
                    title="Delete strategy"
                  >
                    <Trash2 size={13} />
                  </button>

                  <button 
                    onClick={() => onSelectTactic(tactic)}
                    className="flex-1 py-1.5 bg-[#FF4655] hover:bg-[#FF4655]/95 text-black font-mono text-xs font-bold tracking-widest transition duration-150 uppercase flex items-center justify-center space-x-1.5 val-miter-btn active:scale-95 cursor-pointer"
                  >
                    <Play size={10} className="fill-black stroke-none" />
                    <span>LOAD STRATEGY</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

    </div>
  );
}
