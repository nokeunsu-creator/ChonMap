import { useState, useCallback, useRef } from 'react';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function usePanZoom(initialWidth = 800, initialHeight = 600) {
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: -50,
    y: -30,
    width: initialWidth,
    height: initialHeight,
  });

  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || e.button === 0) {
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx * (prev.width / window.innerWidth),
      y: prev.y - dy * (prev.height / window.innerHeight),
    }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(prev => {
      const newWidth = prev.width * factor;
      const newHeight = prev.height * factor;
      const dx = (prev.width - newWidth) / 2;
      const dy = (prev.height - newHeight) / 2;
      return {
        x: prev.x + dx,
        y: prev.y + dy,
        width: Math.max(200, Math.min(3000, newWidth)),
        height: Math.max(150, Math.min(2250, newHeight)),
      };
    });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastPinchDist.current !== null) {
        const factor = lastPinchDist.current / dist;
        setViewBox(prev => {
          const newWidth = prev.width * factor;
          const newHeight = prev.height * factor;
          const ddx = (prev.width - newWidth) / 2;
          const ddy = (prev.height - newHeight) / 2;
          return {
            x: prev.x + ddx,
            y: prev.y + ddy,
            width: Math.max(200, Math.min(3000, newWidth)),
            height: Math.max(150, Math.min(2250, newHeight)),
          };
        });
      }
      lastPinchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
  }, []);

  const resetView = useCallback(() => {
    setViewBox({ x: -50, y: -30, width: initialWidth, height: initialHeight });
  }, [initialWidth, initialHeight]);

  const viewBoxString = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  return {
    viewBoxString,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleTouchMove,
    handleTouchEnd,
    resetView,
  };
}
