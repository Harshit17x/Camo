import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronLeft, Clock, Navigation2, X } from 'lucide-react';
import Map from '../shared/Map';
import { useGeolocation } from '../../hooks/useGeolocation';
import { mapService } from '../../services/mapService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Snap heights ────────────────────────────────────────────────────────────
const COLLAPSED_VH = 0.22; // 22% of screen
const EXPANDED_VH  = 0.75; // 75% of screen

// ─── Recent / quick destinations shared with RiderHome ────────────────────
const QUICK_LOCATIONS = [
  { id: 'gate1', name: 'RRU (Gate-1)', address: 'Main Entrance, RRU Campus', lat: 23.156126, lng: 72.884574 },
  { id: 'gate2', name: 'RRU (Gate-2)', address: 'Secondary Entrance, RRU Campus', lat: 23.152045, lng: 72.880048 },
  { id: 'rru',   name: 'RRU Campus',   address: 'Lavad, Dahegam, Gandhinagar', lat: 23.154578, lng: 72.884973 },
  { id: 'dah',   name: 'Dahegam Bus Stand', address: 'Dahegam, Gandhinagar', lat: 23.1691, lng: 72.8124 },
];

export default function MapScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { location, path } = useGeolocation();

  // ── Panel state ──────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(false);
  const [activeInput, setActiveInput] = useState<'from' | 'to'>('to');
  const [fromValue, setFromValue] = useState('Rashtriya Raksha University');
  const [fromCoords, setFromCoords] = useState<{ lat: number, lng: number } | null>({ lat: 23.154578, lng: 72.884973 });
  const [toValue, setToValue] = useState('');
  const [toCoords, setToCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

  // ── Drag gesture ────────────────────────────────────────────────────────
  const panelY = useMotionValue(0);
  const dragStartY = useRef(0);
  const panelHeightCollapsedBase = Math.max(Math.round(screenH * COLLAPSED_VH), 240); // ensure min height
  const panelHeightCollapsed = panelHeightCollapsedBase + (!expanded && toValue.length > 0 ? 80 : 0);
  const panelHeightExpanded  = Math.min(Math.round(screenH * 0.65), screenH - 280);
  const [panelHeight, setPanelHeight] = useState(panelHeightCollapsed);

  useEffect(() => {
    if (!expanded) {
      setPanelHeight(panelHeightCollapsed);
    }
  }, [expanded, panelHeightCollapsed]);

  // ── Map camera ──────────────────────────────────────────────────────────
  const mapCenter = location || { lat: 23.154578, lng: 72.884973 };

  // ── Suggestions fetching ─────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = activeInput === 'from' ? fromValue : toValue;
      if (query.length > 2) {
        const results = await mapService.autosuggest(query);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [fromValue, toValue, activeInput]);

  // ── Expand/collapse helpers ──────────────────────────────────────────────
  const snapTo = useCallback((isExpanded: boolean) => {
    setExpanded(isExpanded);
    setPanelHeight(isExpanded ? panelHeightExpanded : panelHeightCollapsed);
    panelY.set(0);
  }, [panelHeightCollapsed, panelHeightExpanded, panelY]);

  const handleFocusInput = (input: 'from' | 'to') => {
    setActiveInput(input);
    if (!expanded) snapTo(true);
    setIsFocused(true);
  };

  const handleTapOutside = () => {
    if (expanded) {
      snapTo(false);
      setIsFocused(false);
      fromInputRef.current?.blur();
      toInputRef.current?.blur();
    }
  };

  // ── Drag handlers ────────────────────────────────────────────────────────
  const onDragStart = (e: React.TouchEvent | React.PointerEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    dragStartY.current = clientY;
  };

  const onDragMove = (e: React.TouchEvent | React.PointerEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    const delta = dragStartY.current - clientY; // positive = dragging up
    const newH = Math.max(
      panelHeightCollapsed * 0.8,
      Math.min(panelHeightExpanded * 1.05, panelHeight + delta)
    );
    setPanelHeight(newH);
    dragStartY.current = clientY;
  };

  const onDragEnd = () => {
    const mid = (panelHeightCollapsed + panelHeightExpanded) / 2;
    snapTo(panelHeight > mid);
  };

  // ── Panel backdrop blur intensity ────────────────────────────────────────
  const blurAmount = expanded ? '28px' : '20px';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">

      {/* ── Full-screen Map ─────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Map
          center={mapCenter}
          onMarkerClick={() => {}}
          markers={[
            ...(location?.lat && location?.lng
              ? [{ id: 'user-loc', lat: location.lat, lng: location.lng, type: 'user' as const, title: 'You' }]
              : []),
          ]}
          path={path}
        />
      </motion.div>

      {/* ── Tap backdrop to collapse ────────────────────────────────────── */}
      {expanded && (
        <div
          className="absolute inset-0 z-10"
          style={{ bottom: panelHeight }}
          onClick={handleTapOutside}
        />
      )}


      {/* ── Glass Bottom Panel ──────────────────────────────────────────── */}
      <motion.div
        ref={containerRef}
        className="absolute left-0 right-0 bottom-0 z-20"
        initial={{ y: 120, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 32,
          opacity: { duration: 0.45 },
          scale: { duration: 0.45 },
          delay: 0.15,
        }}
        style={{
          // We let the inner motion.div control the height smoothly instead of jumping the parent
          height: panelHeight,
          willChange: 'height, transform'
        }}
      >
        {/* Animated height wrapper with cinematic moving border */}
        <motion.div
          className="w-full relative overflow-hidden"
          animate={{ height: panelHeight }}
          transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          style={{
            borderRadius: '28px 28px 0 0',
            paddingTop: '4px',
            paddingLeft: '4px',
            paddingRight: '4px',
            boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.3)',
            transform: 'translateZ(0)',
            willChange: 'height, transform'
          }}
        >
          {/* Static glowing border - replaces cinematic-spin for mobile perf */}
          <div
            className="absolute inset-0 z-0"
            style={{ borderRadius: '28px 28px 0 0', boxShadow: 'inset 0 0 0 1.5px rgba(34,197,94,0.25), 0 -4px 20px rgba(34,197,94,0.08)' }}
          />

          {/* Solid inner core (removing backdrop filter entirely for smooth mobile perf) */}
          <div 
             className="relative z-10 w-full h-full flex flex-col px-[20px] pb-[16px]"
             style={{
               backgroundColor: '#0A0A0A',
               borderRadius: '28px 28px 0 0',
             }}
          >
            {/* Inner highlight (retained for 3D feel without blur penalty) */}
            <div className="absolute inset-0 rounded-[26px_26px_0_0] pointer-events-none z-0" style={{ background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 30%)' }} />
            
            {/* Wrapper for content to maintain z-index over highlight */}
            <div className="relative z-10 flex-1 flex flex-col h-full w-full">
          <div
            className="flex-shrink-0 flex justify-center pt-2 pb-4 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onDragStart as any}
            onPointerMove={onDragMove as any}
            onPointerUp={onDragEnd}
            onPointerLeave={onDragEnd}
            onTouchStart={onDragStart as any}
            onTouchMove={onDragMove as any}
            onTouchEnd={onDragEnd}
          >
            <div
              className="w-[36px] h-[4px] rounded-full transition-colors duration-200"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
            />
          </div>

          {/* ── Panel Content ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex flex-col gap-4">

            {/* Location Inputs Container */}
            <div 
              className="relative flex flex-col px-[16px] py-[14px] rounded-[18px]"
              style={{
                background: '#111111',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              {/* Connecting Wire */}
              <svg className="absolute left-[24px] top-[40px] w-[2px] h-[24px] z-0" style={{ strokeDasharray: "4 4", animation: "line-flow 1.5s linear infinite" }}>
                <line x1="1" y1="0" x2="1" y2="24" stroke="rgba(34, 197, 94, 0.15)" strokeWidth="1" />
              </svg>
              
              {/* From Row */}
              <div className="flex items-center gap-4 relative z-10">
                <div 
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.20)' }}
                >
                  <div className="w-[8px] h-[8px] rounded-full bg-[#22C55E]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center relative">
                  <p className="text-[9px] tracking-[0.2em] font-dm uppercase mb-0.5" style={{ color: '#4ADE80', opacity: 0.8 }}>From</p>
                  <input
                    ref={fromInputRef}
                    type="text"
                    value={fromValue}
                    onChange={(e) => {
                      setFromValue(e.target.value);
                      setActiveInput('from');
                    }}
                    onFocus={() => handleFocusInput('from')}
                    onBlur={() => setIsFocused(false)}
                    placeholder={location ? 'Current Location' : 'Locating…'}
                    className="w-full bg-transparent text-[17px] font-sora font-semibold outline-none placeholder-[#2D4A33]"
                    style={{ color: 'rgba(255, 255, 255, 0.92)' }}
                  />
                </div>
                <button 
                  onClick={() => navigate(-1)} 
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80 group"
                  style={{
                    background: '#1A1A1A',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <X size={16} strokeWidth={2} style={{ color: 'rgba(255, 255, 255, 0.50)' }} />
                </button>
              </div>

              {/* 16px gap area for wire */}
              <div className="h-[20px]" />

              {/* To Row */}
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-[18px] flex justify-center items-center flex-shrink-0">
                  <div 
                    className="w-[9px] h-[9px] animate-[breathe_2.5s_ease_infinite]"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.35)', borderRadius: '1px' }}
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center relative">
                  <p className="text-[9px] tracking-[0.2em] font-dm uppercase mb-0.5" style={{ color: '#4ADE80', opacity: 0.8 }}>To</p>
                  <input
                    ref={toInputRef}
                    type="text"
                    value={toValue}
                    onChange={(e) => {
                      setToValue(e.target.value);
                      setActiveInput('to');
                    }}
                    onFocus={() => handleFocusInput('to')}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Where to?"
                    className="w-full bg-transparent text-[17px] font-sora font-semibold outline-none placeholder-[#2D4A33]"
                    style={{ color: 'rgba(255, 255, 255, 0.92)' }}
                  />
                </div>
                {toValue.length > 0 && (
                  <button
                    onClick={() => { setToValue(''); setSuggestions([]); }}
                    className="w-[38px] h-[38px] rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ color: 'rgba(255, 255, 255, 0.50)' }}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Expanded Content ─────────────────────────────────────── */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  key="expanded-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {/* Suggestions from API */}
                  {suggestions.length > 0 ? (
                    <>
                      <p className="text-[10px] tracking-[0.3em] font-dm uppercase px-4 pb-2" style={{ color: '#4ADE80', opacity: 0.6 }}>
                        Results
                      </p>
                      <div className="flex flex-col gap-[8px]">
                        {suggestions.map((s, idx) => (
                          <div key={s.id}>
                            <button
                              onClick={() => {
                                if (activeInput === 'from') {
                                  setFromValue(s.placeName);
                                  if (s.center) setFromCoords({ lat: s.center[1], lng: s.center[0] });
                                } else {
                                  setToValue(s.placeName);
                                  if (s.center) setToCoords({ lat: s.center[1], lng: s.center[0] });
                                }
                                setSuggestions([]);
                                snapTo(false);
                              }}
                              className="w-full text-left transition-all hover:scale-[0.98] active:scale-[0.96]"
                              style={{
                                background: '#111111',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '14px',
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                              }}
                            >
                              <div
                                style={{
                                  background: 'rgba(0, 0, 0, 0.50)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '10px',
                                  width: '40px',
                                  height: '40px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <MapPin size={20} style={{ color: 'rgba(255, 255, 255, 0.40)' }} />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="font-sora font-semibold truncate" style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '15px' }}>{s.placeName}</p>
                                <p className="font-dm font-normal truncate mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '12px' }}>{s.placeAddress}</p>
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : toValue.length === 0 ? (
                    /* Quick locations when input is empty */
                    <>
                      <p className="text-[10px] tracking-[0.3em] font-dm uppercase px-4 pb-2 pt-2" style={{ color: '#4ADE80', opacity: 0.6 }}>
                        Recent & Nearby
                      </p>
                      <div className="flex flex-col gap-[8px]">
                        {QUICK_LOCATIONS.map((loc, idx) => (
                          <div key={loc.id}>
                            <button
                              onClick={() => {
                                if (activeInput === 'from') {
                                  setFromValue(loc.name);
                                  setFromCoords({ lat: loc.lat, lng: loc.lng });
                                } else {
                                  setToValue(loc.name);
                                  setToCoords({ lat: loc.lat, lng: loc.lng });
                                }
                                snapTo(false);
                              }}
                              className="w-full text-left transition-all hover:scale-[0.98] active:scale-[0.96]"
                              style={{
                                background: '#111111',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '14px',
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                              }}
                            >
                              <div
                                style={{
                                  background: 'rgba(0, 0, 0, 0.50)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '10px',
                                  width: '40px',
                                  height: '40px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <Clock size={20} style={{ color: 'rgba(255, 255, 255, 0.40)' }} />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="font-sora font-semibold truncate" style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '15px' }}>{loc.name}</p>
                                <p className="font-dm font-normal truncate mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '12px' }}>{loc.address}</p>
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* Searching state */
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Search size={28} style={{ color: 'rgba(255, 255, 255, 0.40)' }} />
                      <p className="text-[10px] tracking-[0.35em] font-dm font-bold uppercase mt-2" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                        Type to search
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Confirm Button ────────────────────────────────────────────── */}
            {!expanded && toValue.length > 0 && (
              <button
                onClick={() => navigate('/', { 
                  state: { 
                    pickup: fromValue,
                    pickupCoords: fromCoords,
                    destination: toValue, 
                    destinationCoords: toCoords,
                    intent: 'select_ride' 
                  } 
                })}
                className="w-full h-[54px] rounded-[16px] text-white font-sora font-semibold text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center mt-4 mb-[24px]"
                style={{ background: '#22C55E' }}
              >
                Confirm Destination
              </button>
            )}
            </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
