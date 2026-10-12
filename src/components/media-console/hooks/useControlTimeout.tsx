import {Dispatch, SetStateAction, useCallback, useEffect, useRef} from 'react';

interface ControlTimeoutProps {
  controlTimeoutDelay: number;
  mounted: boolean;
  showControls: boolean;
  setShowControls: Dispatch<SetStateAction<boolean>>;
  alwaysShowControls: boolean;
}

export const useControlTimeout = ({
  controlTimeoutDelay,
  mounted,
  showControls,
  setShowControls,
  alwaysShowControls,
}: ControlTimeoutProps) => {
  const controlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showControlsRef = useRef(showControls);
  showControlsRef.current = showControls;

  const mountedRef = useRef(mounted);
  mountedRef.current = mounted;

  const clearControlTimeout = useCallback(() => {
    if (controlTimeoutRef.current) {
      clearTimeout(controlTimeoutRef.current);
      controlTimeoutRef.current = null;
    }
  }, []);

  const hideControls = useCallback(() => {
    if (mountedRef.current && showControlsRef.current && !alwaysShowControls) {
      setShowControls(false);
    }
  }, [alwaysShowControls, setShowControls]);

  const setControlTimeout = useCallback(() => {
    clearControlTimeout();
    if (showControlsRef.current && !alwaysShowControls) {
      controlTimeoutRef.current = setTimeout(
        hideControls,
        controlTimeoutDelay,
      );
    }
  }, [alwaysShowControls, clearControlTimeout, controlTimeoutDelay, hideControls]);

  const resetControlTimeout = setControlTimeout;

  useEffect(() => {
    if (showControls) {
      setControlTimeout();
    }
    return clearControlTimeout;
  }, [showControls, clearControlTimeout, setControlTimeout]);

  return {
    clearControlTimeout,
    resetControlTimeout,
    hideControls,
    setControlTimeout,
  };
};
