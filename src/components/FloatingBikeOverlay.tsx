import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { X } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

export function FloatingBikeOverlay() {
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isOverDismissZone, setIsOverDismissZone] = useState(false);

  const bikeRef = useRef<HTMLDivElement>(null);
  const dismissZoneRef = useRef<HTMLDivElement>(null);
  const latestPosRef = useRef<Position | null>(null);
  const dragOriginRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!position) return;

    const handleResize = () => {
      const el = bikeRef.current;
      const width = el?.offsetWidth ?? 128;
      const height = el?.offsetHeight ?? 128;
      setPosition((prev) => {
        if (!prev) return prev;
        const clamped = {
          x: Math.min(Math.max(8, prev.x), Math.max(8, window.innerWidth - width - 8)),
          y: Math.min(Math.max(8, prev.y), Math.max(8, window.innerHeight - height - 8)),
        };
        latestPosRef.current = clamped;
        return clamped;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  if (dismissed) return null;

  const checkHitDismissZone = (bikeCenterX: number, bikeCenterY: number): boolean => {
    const zoneEl = dismissZoneRef.current;
    if (!zoneEl) return false;
    const rect = zoneEl.getBoundingClientRect();
    const zoneCenterX = rect.left + rect.width / 2;
    const zoneCenterY = rect.top + rect.height / 2;
    const distance = Math.hypot(bikeCenterX - zoneCenterX, bikeCenterY - zoneCenterY);
    return distance <= 72;
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const el = bikeRef.current;
    if (!el) return;

    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events without active pointerId
    }

    const rect = el.getBoundingClientRect();
    const currentPos = latestPosRef.current ?? { x: rect.left, y: rect.top };
    latestPosRef.current = currentPos;
    setPosition(currentPos);
    setIsPressed(true);
    setIsOverDismissZone(false);

    dragOriginRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: currentPos.x,
      startY: currentPos.y,
      width: rect.width,
      height: rect.height,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    if (!origin) return;

    const rawX = origin.startX + (e.clientX - origin.pointerX);
    const rawY = origin.startY + (e.clientY - origin.pointerY);

    const clampedX = Math.min(Math.max(8, rawX), Math.max(8, window.innerWidth - origin.width - 8));
    const clampedY = Math.min(
      Math.max(8, rawY),
      Math.max(8, window.innerHeight - origin.height - 8)
    );

    const nextPos = { x: clampedX, y: clampedY };
    latestPosRef.current = nextPos;
    setPosition(nextPos);

    const bikeCenterX = clampedX + origin.width / 2;
    const bikeCenterY = clampedY + origin.height / 2;
    setIsOverDismissZone(checkHitDismissZone(bikeCenterX, bikeCenterY));
  };

  const handlePointerUpOrCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    if (!origin) return;

    const el = bikeRef.current;
    if (el) {
      try {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore synthetic events
      }
    }

    const finalPos = latestPosRef.current ?? { x: origin.startX, y: origin.startY };
    const shouldDismiss =
      e.type !== 'pointercancel' &&
      checkHitDismissZone(finalPos.x + origin.width / 2, finalPos.y + origin.height / 2);

    dragOriginRef.current = null;
    setIsPressed(false);
    setIsOverDismissZone(false);

    if (shouldDismiss) {
      setDismissed(true);
    }
  };

  return (
    <>
      {/* Temporary X Drop Zone shown while pressing/dragging the bike */}
      <div
        aria-hidden={!isPressed}
        data-testid="floating-bike-dismiss-zone"
        className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 transition-all duration-200 ${
          isPressed ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'
        }`}
      >
        <div
          ref={dismissZoneRef}
          className={`w-14 h-14 rounded-full border flex items-center justify-center surface-glass transition-all duration-150 ${
            isOverDismissZone
              ? 'bg-red-600 text-white border-red-400 scale-110 shadow-[0_14px_34px_-6px_rgba(220,38,38,0.6)]'
              : 'bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 shadow-[0_14px_32px_-10px_rgba(9,9,11,0.28)]'
          }`}
        >
          <X className="w-6 h-6" strokeWidth={2.25} />
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium surface-glass shadow-sm transition-colors ${
            isOverDismissZone
              ? 'bg-red-600 text-white'
              : 'bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80'
          }`}
        >
          {isOverDismissZone ? 'Solte para remover' : 'Arraste até o X para remover'}
        </span>
      </div>

      {/* Draggable Floating Bike */}
      <div
        ref={bikeRef}
        role="button"
        tabIndex={0}
        aria-label="Bike flutuante — arraste para mover pela tela ou solte sobre o X para remover"
        data-testid="floating-bike-overlay"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onKeyDown={(e) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            setDismissed(true);
          }
        }}
        style={
          position
            ? { left: `${position.x}px`, top: `${position.y}px` }
            : undefined
        }
        className={`fixed z-40 select-none touch-none flex flex-col items-center cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl ${
          position ? '' : 'bottom-20 md:bottom-5 right-2 sm:right-5'
        } ${
          isOverDismissZone
            ? 'scale-75 opacity-75 transition-transform duration-150'
            : isPressed
              ? 'scale-105 transition-transform duration-100'
              : ''
        }`}
      >
        <img
          src="/assets/aistudio/images-removebg-preview_5674c523.png"
          alt=""
          draggable={false}
          className={`w-24 sm:w-32 lg:w-36 h-auto object-contain pointer-events-none drop-shadow-[0_14px_18px_rgba(9,9,11,0.26)] dark:drop-shadow-[0_18px_24px_rgba(0,0,0,0.78)] ${
            isPressed ? '' : 'locu-bike-float'
          }`}
        />
        <div
          className={`-mt-3 w-14 sm:w-20 h-2.5 rounded-full bg-zinc-950/20 dark:bg-black/60 blur-sm pointer-events-none ${
            isPressed ? 'opacity-40 scale-90 transition-all' : 'locu-bike-shadow'
          }`}
        />
      </div>
    </>
  );
}
