interface OSSupport {
  showControls: boolean;
  onScreenTouch: () => void;
}

export const TVOSSupport = ({showControls, onScreenTouch}: OSSupport) => {
  const useTVEventHandler = (require('react-native') as any).useTVEventHandler;
  if (typeof useTVEventHandler === 'function') {
    useTVEventHandler(() => {
      if (!showControls) {
        onScreenTouch();
      }
    });
  }

  return null;
};
