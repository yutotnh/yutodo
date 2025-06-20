// OS detection utility
export const detectOS = () => {
  if (typeof navigator !== 'undefined') {
    const platform = navigator.platform.toUpperCase();
    if (platform.indexOf('MAC') >= 0 || platform.indexOf('IPHONE') >= 0 || platform.indexOf('IPAD') >= 0) {
      return 'mac';
    }
    if (platform.indexOf('WIN') >= 0) {
      return 'windows';
    }
    if (platform.indexOf('LINUX') >= 0) {
      return 'linux';
    }
  }
  // Tauri環境での追加チェック
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    // Tauriの場合、さらに詳細な検知が可能
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) return 'mac';
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('linux')) return 'linux';
  }
  return 'unknown';
};