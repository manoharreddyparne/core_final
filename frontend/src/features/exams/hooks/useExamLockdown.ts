import { useEffect, useState, useCallback } from 'react';

interface LockdownOptions {
  active: boolean;
  onViolation: (type: string, details: any) => void;
  strictMode?: boolean;
}

export const useExamLockdown = ({ active, onViolation }: LockdownOptions) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreenChange = useCallback(() => {
    const isFull = !!document.fullscreenElement;
    setIsFullscreen(isFull);
    if (active && !isFull) {
      onViolation('FULLSCREEN_EXIT', { timestamp: new Date().toISOString() });
    }
  }, [active, onViolation]);

  const handleVisibilityChange = useCallback(() => {
    if (active && document.hidden) {
      onViolation('TAB_SWITCH', { timestamp: new Date().toISOString() });
    }
  }, [active, onViolation]);

  const handleWindowBlur = useCallback(() => {
    if (active) {
      onViolation('WINDOW_BLUR', { timestamp: new Date().toISOString() });
    }
  }, [active, onViolation]);

  const checkMonitors = useCallback(() => {
    // Basic multi-screen detection logic
    if (active && window.screen && (window.screen as any).isExtended) {
       onViolation('MULTI_SCREEN_DETECTED', { detail: 'Extended display detected' });
    }
    // Checking inner vs outer width as a secondary heuristic
    if (active && window.screen.width > window.innerWidth * 1.5) {
       // Potential ultra-wide or multiple monitors
    }
  }, [active, onViolation]);

  const clearClipboard = useCallback(() => {
    if (active && navigator.clipboard) {
       navigator.clipboard.writeText('Secure Exam Content: Clipboard Blocked').catch(() => {});
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;

    // 1. Visibility and Focus Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 2. Prevent Keyboard Shortcuts
    const preventShortcuts = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        onViolation('DEV_TOOLS_DETECTED', { key: 'F12' });
      }
      // Ctrl+Shift+I, J, C
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        onViolation('DEV_TOOLS_DETECTED', { key: 'CTRL_SHIFT_SHORTCUT' });
      }
      // Ctrl+C, Ctrl+V, Ctrl+U (View Source)
      if (e.ctrlKey && ['C', 'V', 'U'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        onViolation('INTERDICTED_SHORTCUT', { key: e.key });
      }
      // Alt+Tab (not fully blockable, but blur handler catches it)
    };
    window.addEventListener('keydown', preventShortcuts);

    // 3. Prevent Context Menu
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onViolation('RIGHT_CLICK', { timestamp: new Date().toISOString() });
    };
    window.addEventListener('contextmenu', preventContextMenu);

    // 4. Secure Clipboard & Monitor Check
    const intervalId = setInterval(() => {
      clearClipboard();
      checkMonitors();
    }, 5000);

    // 5. Prevent Print
    const preventPrint = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        onViolation('PRINT_ATTEMPT', { detail: 'Ctrl+P blocked' });
      }
    };
    window.addEventListener('keydown', preventPrint);

    // 4. Force Fullscreen on Mount
    const enterFull = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.error("Fullscreen failed", err);
      }
    };
    
    // We don't force it here because it needs user gesture, 
    // but the UI should have a button that triggers this.

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', preventShortcuts);
      window.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('keydown', preventPrint);
      clearInterval(intervalId);
    };
  }, [active, handleVisibilityChange, handleWindowBlur, handleFullscreenChange, onViolation]);

  return { isFullscreen };
};
