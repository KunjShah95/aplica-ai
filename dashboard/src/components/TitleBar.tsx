import { useEffect, useState } from 'react';
import { Minus, Square, X, Zap } from 'lucide-react';

/**
 * Custom frameless title bar for Electron.
 * Falls back to nothing on web.
 */
export default function TitleBar() {
  const [isElectron, setIsElectron] = useState(false);
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.isElectron) {
      setIsElectron(true);
      api.getPlatform().then((p: string) => setPlatform(p));
    }
  }, []);

  if (!isElectron) return null;

  const api = (window as any).electronAPI;
  const isMac = platform === 'darwin';

  return (
    <div
      className="h-10 bg-dark-950 border-b border-glass-border flex items-center select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Mac: traffic lights on the left */}
      {isMac && (
        <div
          className="flex items-center gap-1.5 px-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => api.close()}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
          />
          <button
            onClick={() => api.minimize()}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors"
          />
          <button
            onClick={() => { api.maximize(); }}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
          />
        </div>
      )}

      {/* App title / icon */}
      <div className="flex items-center gap-2 px-4 flex-1">
        {!isMac && (
          <div className="w-5 h-5 rounded bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center mr-1">
            <Zap className="w-3 h-3 text-white" />
          </div>
        )}
        <span className="text-xs font-bold text-dark-400 tracking-widest uppercase">
          Aplica AI
        </span>
      </div>

      {/* Windows/Linux: window controls on the right */}
      {!isMac && (
        <div
          className="flex items-center"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => api.minimize()}
            className="w-10 h-10 flex items-center justify-center text-dark-400 hover:bg-dark-800 hover:text-white transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { api.maximize(); }}
            className="w-10 h-10 flex items-center justify-center text-dark-400 hover:bg-dark-800 hover:text-white transition-colors"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => api.close()}
            className="w-10 h-10 flex items-center justify-center text-dark-400 hover:bg-red-600 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
