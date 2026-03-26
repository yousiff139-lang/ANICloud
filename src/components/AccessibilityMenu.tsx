'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Accessibility, Eye, Type, Contrast, Volume2, X } from 'lucide-react';

export default function AccessibilityMenu() {
  const [showMenu, setShowMenu] = useState(false);
  const [settings, setSettings] = useState({
    fontSize: 'normal',
    contrast: 'normal',
    reducedMotion: false,
    screenReader: false,
    keyboardNav: true
  });

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }

    // Apply settings
    applySettings(settings);
  }, []);

  const applySettings = (newSettings: typeof settings) => {
    const root = document.documentElement;

    // Font size
    switch (newSettings.fontSize) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      case 'xlarge':
        root.style.fontSize = '22px';
        break;
      default:
        root.style.fontSize = '16px';
    }

    // Contrast
    if (newSettings.contrast === 'high') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (newSettings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Screen reader mode
    if (newSettings.screenReader) {
      root.setAttribute('data-screen-reader', 'true');
    } else {
      root.removeAttribute('data-screen-reader');
    }

    // Save settings
    localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));
  };

  const updateSetting = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    applySettings(newSettings);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowMenu(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-neonCyan to-pulsingViolet flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-40"
        aria-label="Open accessibility menu"
      >
        <Accessibility size={24} className="text-white" />
      </button>

      {/* Menu Panel */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-96 glass border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Accessibility className="text-neonCyan" />
                    Accessibility
                  </h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 rounded-xl hover:bg-white/10 transition-all"
                    aria-label="Close menu"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Settings */}
                <div className="space-y-6">
                  {/* Font Size */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3">
                      <Type size={18} className="text-neonCyan" />
                      Font Size
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'small', label: 'S' },
                        { value: 'normal', label: 'M' },
                        { value: 'large', label: 'L' },
                        { value: 'xlarge', label: 'XL' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateSetting('fontSize', option.value)}
                          className={`py-3 rounded-xl font-bold transition-all ${
                            settings.fontSize === option.value
                              ? 'bg-neonCyan text-black'
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                          aria-label={`Set font size to ${option.label}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contrast */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3">
                      <Contrast size={18} className="text-neonCyan" />
                      Contrast
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'normal', label: 'Normal' },
                        { value: 'high', label: 'High Contrast' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateSetting('contrast', option.value)}
                          className={`py-3 rounded-xl font-bold transition-all ${
                            settings.contrast === option.value
                              ? 'bg-neonCyan text-black'
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                          aria-label={option.label}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reduced Motion */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <Eye size={18} className="text-neonCyan" />
                      <div>
                        <div className="font-bold">Reduced Motion</div>
                        <div className="text-xs text-white/60">Minimize animations</div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                      className={`w-12 h-6 rounded-full transition-all ${
                        settings.reducedMotion ? 'bg-neonCyan' : 'bg-white/20'
                      }`}
                      aria-label={`Reduced motion ${settings.reducedMotion ? 'enabled' : 'disabled'}`}
                      role="switch"
                      aria-checked={settings.reducedMotion}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          settings.reducedMotion ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Screen Reader Mode */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <Volume2 size={18} className="text-neonCyan" />
                      <div>
                        <div className="font-bold">Screen Reader Mode</div>
                        <div className="text-xs text-white/60">Enhanced descriptions</div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('screenReader', !settings.screenReader)}
                      className={`w-12 h-6 rounded-full transition-all ${
                        settings.screenReader ? 'bg-neonCyan' : 'bg-white/20'
                      }`}
                      aria-label={`Screen reader mode ${settings.screenReader ? 'enabled' : 'disabled'}`}
                      role="switch"
                      aria-checked={settings.screenReader}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          settings.screenReader ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Keyboard Navigation Info */}
                  <div className="p-4 rounded-xl bg-neonCyan/10 border border-neonCyan/20">
                    <h3 className="font-bold mb-2 text-neonCyan">Keyboard Shortcuts</h3>
                    <div className="space-y-2 text-sm text-white/70">
                      <div className="flex justify-between">
                        <span>Navigate:</span>
                        <kbd className="px-2 py-1 bg-white/10 rounded">Tab</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Select:</span>
                        <kbd className="px-2 py-1 bg-white/10 rounded">Enter</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Search:</span>
                        <kbd className="px-2 py-1 bg-white/10 rounded">Ctrl+K</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Play/Pause:</span>
                        <kbd className="px-2 py-1 bg-white/10 rounded">Space</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() => {
                      const defaultSettings = {
                        fontSize: 'normal',
                        contrast: 'normal',
                        reducedMotion: false,
                        screenReader: false,
                        keyboardNav: true
                      };
                      setSettings(defaultSettings);
                      applySettings(defaultSettings);
                    }}
                    className="w-full py-3 rounded-xl glass hover:bg-white/10 transition-all font-bold"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
