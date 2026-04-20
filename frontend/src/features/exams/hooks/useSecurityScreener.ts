import { useEffect } from 'react';

/**
 * useSecurityScreener
 * Forensic utility to harden the browser environment.
 */
export const useSecurityScreener = (active: boolean, onViolation: (type: string, details: any) => void) => {
  useEffect(() => {
    if (!active) return;

    // 1. Clipboard Sanitization (Anti-Leaking)
    const sanitizeClipboard = async () => {
      try {
        await navigator.clipboard.writeText("ASEP_PROTECTED_CONTENT");
      } catch (e) {
        console.warn("Clipboard hardening bypassed by browser policy.");
      }
    };

    // 2. Clear clipboard on copy attempt
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolation('CLIPBOARD_COPY_ATTEMPT', { timestamp: new Date().toISOString() });
      sanitizeClipboard();
    };

    // 3. Multi-Monitor / Screen Change Detection
    const handleScreenChange = () => {
      if (window.screen.availWidth > window.innerWidth + 100) {
        onViolation('EXTENDED_DISPLAY_DETECTED', { detail: 'Dual monitor suspicion' });
      }
    };

    document.addEventListener('copy', handleCopy);
    window.addEventListener('resize', handleScreenChange);
    
    const interval = setInterval(sanitizeClipboard, 30000); // Periodic wipe

    return () => {
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('resize', handleScreenChange);
      clearInterval(interval);
    };
  }, [active, onViolation]);
};
