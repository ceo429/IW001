import { useMemo, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import type { SpatialDevice } from '../types';

interface Props {
  svg: string;
  devices: SpatialDevice[];
  selectedDeviceId: string | null;
  onSelectDevice(id: string | null): void;
  editMode: boolean;
  /** When set, the next click on the canvas places this device there. */
  placingDeviceId: string | null;
  onPlace(deviceId: string, posX: number, posY: number): void;
  /** Hide devices that are online. */
  offlineOnly: boolean;
  /** Multiplier for the SVG's rendered size; 1.0 = intrinsic. */
  zoom: number;
}

const CATEGORY_TONE: Record<string, string> = {
  switch: '#eab308',
  hub: '#3b82f6',
  plug: '#22c55e',
  sensor: '#a855f7',
  dc: '#f97316',
  media: '#06b6d4',
  etc: '#737373',
};

/**
 * Interactive floor plan canvas. Renders the (sanitized) SVG background and
 * overlays device markers as absolutely-positioned dots computed from each
 * device's normalized (0..1) coordinates.
 *
 * Two click behaviors, selected by the `editMode` + `placingDeviceId` props:
 *   1. Normal mode — clicking a marker selects it (calls onSelectDevice).
 *   2. Placement mode — when a device from the sidebar is chosen as
 *      "placing", the next click on the canvas computes normalized coords
 *      from the cursor position and calls onPlace, anchoring the marker.
 *
 * Security note: the SVG string comes from the server (already sanitized
 * once via homes.service.sanitizeSvgForStorage) but we ALSO run
 * sanitizeHtml() here as a second defense per docs/SECURITY.md §4.
 */
export function FloorPlanCanvas({
  svg,
  devices,
  selectedDeviceId,
  onSelectDevice,
  editMode,
  placingDeviceId,
  onPlace,
  offlineOnly,
  zoom,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Second sanitize pass. Memoized because DOMPurify is expensive on
  // 500KB payloads and the svg string only changes on save.
  const safeSvg = useMemo(() => sanitizeHtml(svg), [svg]);

  function handleCanvasClick(e: RMouseEvent<HTMLDivElement>) {
    if (!editMode || !placingDeviceId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Clamp just in case the event fires right at the edge.
    const posX = Math.max(0, Math.min(1, x));
    const posY = Math.max(0, Math.min(1, y));
    onPlace(placingDeviceId, posX, posY);
  }

  const visible = devices.filter(
    (d) => d.posX !== null && d.posY !== null && (!offlineOnly || !d.online),
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950"
      style={{
        aspectRatio: '5 / 3',
      }}
    >
      <div
        ref={containerRef}
        className={`absolute inset-0 origin-center transition-transform ${
          editMode && placingDeviceId ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{ transform: `scale(${zoom})` }}
        onClick={handleCanvasClick}
      >
        {/*
          Render the background SVG via dangerouslySetInnerHTML after the
          double-sanitize pipeline. This is the one allowed use of the
          API in the codebase — comment here matches docs/SECURITY.md §4.
        */}
        <div
          className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: safeSvg }}
        />

        {visible.map((device) => {
          const color = CATEGORY_TONE[device.category] ?? '#737373';
          const isSelected = device.id === selectedDeviceId;
          const isHovered = device.id === hoveredId;
          return (
            <button
              key={device.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDevice(device.id);
              }}
              onMouseEnter={() => setHoveredId(device.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{
                left: `${(device.posX ?? 0) * 100}%`,
                top: `${(device.posY ?? 0) * 100}%`,
              }}
              aria-label={device.name}
              title={device.name}
            >
              <span
                className={`block h-3 w-3 rounded-full ring-2 transition ${
                  isSelected
                    ? 'ring-white'
                    : device.online
                      ? 'ring-neutral-900/80'
                      : 'ring-red-500/60'
                }`}
                style={{
                  backgroundColor: color,
                  boxShadow: isSelected ? '0 0 0 4px rgba(234,179,8,0.35)' : undefined,
                }}
              />
              {(isSelected || isHovered) && (
                <span className="absolute left-4 top-0 whitespace-nowrap rounded bg-neutral-900/95 px-1.5 py-0.5 text-[10px] text-neutral-100 ring-1 ring-neutral-700">
                  {device.name}
                  {!device.online && (
                    <span className="ml-1 text-red-400">● offline</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {editMode && placingDeviceId && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-brand-500/20 px-2 py-1 text-[10px] text-brand-300 ring-1 ring-brand-500/40">
          도면을 클릭해 기기 위치를 지정하세요
        </div>
      )}
    </div>
  );
}
