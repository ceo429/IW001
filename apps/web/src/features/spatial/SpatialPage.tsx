import { useState } from 'react';
import { DEFAULT_FLOOR_PLAN_SVG } from '@iw001/shared';
import { useHomesList } from '@/features/homes/api/useHomes';
import {
  useSetFloorPlan,
  useSpatialHome,
  useUpdateDevicePosition,
} from './api/useSpatial';
import { FloorPlanCanvas } from './components/FloorPlanCanvas';
import type { SpatialDevice } from './types';

/**
 * 공간매핑 (Spatial). A master/detail page:
 *
 *   Left column  : home picker (reuses the /homes list)
 *   Right column : FloorPlanCanvas + toolbar + device side panel
 *
 * Edit flow:
 *   1. Toggle "편집 모드"
 *   2. Click an unplaced device (or any device) in the sidebar
 *   3. Click somewhere on the canvas to place it there
 *
 * Removing a device from the floor plan sets posX / posY to null.
 */
export function SpatialPage() {
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [placingDeviceId, setPlacingDeviceId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offlineOnly, setOfflineOnly] = useState(false);

  const homes = useHomesList({ filter: 'all' });
  const homeQuery = useSpatialHome(selectedHomeId ?? undefined);

  const home = homeQuery.data;
  const updatePosition = useUpdateDevicePosition(selectedHomeId ?? '');
  const setFloorPlan = useSetFloorPlan(selectedHomeId ?? '');

  // Auto-select the first home when the list first arrives.
  if (!selectedHomeId && homes.data && homes.data.length > 0) {
    setSelectedHomeId(homes.data[0]!.id);
  }

  const devices = home?.devices ?? [];
  const placed = devices.filter((d) => d.posX !== null && d.posY !== null);
  const unplaced = devices.filter((d) => d.posX === null || d.posY === null);
  const selectedDevice =
    selectedDeviceId ? devices.find((d) => d.id === selectedDeviceId) : undefined;

  function onPlace(deviceId: string, posX: number, posY: number) {
    updatePosition.mutate({ deviceId, posX, posY });
    setPlacingDeviceId(null);
    setSelectedDeviceId(deviceId);
  }

  function onUnplace(deviceId: string) {
    updatePosition.mutate({ deviceId, posX: null, posY: null });
    setSelectedDeviceId(null);
  }

  function onResetFloorPlan() {
    if (
      !confirm(
        '도면을 기본 템플릿으로 재설정하시겠습니까?\n기존 기기 좌표는 유지됩니다.',
      )
    ) {
      return;
    }
    setFloorPlan.mutate(DEFAULT_FLOOR_PLAN_SVG);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">운영</div>
          <h1 className="mt-1 text-2xl font-bold">공간매핑</h1>
          <p className="mt-1 text-xs text-neutral-500">
            장소별 도면에 기기 위치를 배치하고 온/오프라인 상태를 한눈에 확인합니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr_18rem]">
        {/* ---------- Home picker ---------- */}
        <aside className="space-y-2">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            장소
          </h2>
          {homes.isLoading && (
            <div className="card text-xs text-neutral-500">불러오는 중…</div>
          )}
          {homes.data?.map((h) => {
            const active = h.id === selectedHomeId;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setSelectedHomeId(h.id);
                  setSelectedDeviceId(null);
                  setPlacingDeviceId(null);
                }}
                className={`block w-full rounded-lg border p-3 text-left transition ${
                  active
                    ? 'border-brand-500/50 bg-brand-500/5'
                    : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                }`}
              >
                <div className="truncate text-sm font-semibold text-neutral-100">
                  {h.name}
                </div>
                <div className="mt-0.5 text-[10px] text-neutral-500">
                  {h.customer.name} · 기기 {h.totalDevices}
                </div>
              </button>
            );
          })}
        </aside>

        {/* ---------- Canvas + toolbar ---------- */}
        <div className="min-w-0">
          {!home && (
            <div className="card text-center text-sm text-neutral-500">
              왼쪽에서 장소를 선택하세요.
            </div>
          )}

          {home && (
            <>
              <div className="card mb-3 flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-neutral-100">
                    {home.name}
                  </h2>
                  {home.customer && (
                    <div className="text-xs text-neutral-500">{home.customer.name}</div>
                  )}
                </div>

                <label className="flex items-center gap-1 text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    checked={offlineOnly}
                    onChange={(e) => setOfflineOnly(e.target.checked)}
                  />
                  오프라인만
                </label>

                <div className="flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-950 px-1 py-0.5">
                  <button
                    type="button"
                    className="px-2 text-xs text-neutral-400 hover:text-neutral-100"
                    onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                    aria-label="축소"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-[10px] font-mono tabular-nums text-neutral-400">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    className="px-2 text-xs text-neutral-400 hover:text-neutral-100"
                    onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                    aria-label="확대"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className={editMode ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => {
                    setEditMode((v) => !v);
                    setPlacingDeviceId(null);
                  }}
                >
                  {editMode ? '편집 종료' : '편집 모드'}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onResetFloorPlan}
                  disabled={setFloorPlan.isPending}
                  title="도면을 기본 그리드 템플릿으로 재설정"
                >
                  도면 리셋
                </button>
              </div>

              <FloorPlanCanvas
                svg={home.floorPlanSvg ?? DEFAULT_FLOOR_PLAN_SVG}
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={setSelectedDeviceId}
                editMode={editMode}
                placingDeviceId={placingDeviceId}
                onPlace={onPlace}
                offlineOnly={offlineOnly}
                zoom={zoom}
              />

              <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                <MetaPill label="전체" value={devices.length} />
                <MetaPill label="배치됨" value={placed.length} tone="brand" />
                <MetaPill label="미배치" value={unplaced.length} tone="warn" />
                <MetaPill
                  label="오프라인"
                  value={devices.filter((d) => !d.online).length}
                  tone={devices.some((d) => !d.online) ? 'bad' : 'mute'}
                />
              </div>
            </>
          )}
        </div>

        {/* ---------- Device side panel ---------- */}
        <aside>
          {home && (
            <>
              <DeviceListPanel
                title="미배치"
                devices={unplaced}
                editMode={editMode}
                placingDeviceId={placingDeviceId}
                onBeginPlace={(id) => setPlacingDeviceId(id)}
                onSelect={setSelectedDeviceId}
                selectedDeviceId={selectedDeviceId}
              />
              <div className="mt-4">
                <DeviceListPanel
                  title="배치된 기기"
                  devices={placed}
                  editMode={editMode}
                  placingDeviceId={placingDeviceId}
                  onBeginPlace={(id) => setPlacingDeviceId(id)}
                  onSelect={setSelectedDeviceId}
                  selectedDeviceId={selectedDeviceId}
                />
              </div>

              {selectedDevice && (
                <div className="card mt-4">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    {selectedDevice.name}
                  </h3>
                  <dl className="mt-2 space-y-1 text-xs text-neutral-400">
                    <div className="flex justify-between">
                      <dt>카테고리</dt>
                      <dd className="text-neutral-200">{selectedDevice.category}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>상태</dt>
                      <dd
                        className={
                          selectedDevice.online ? 'text-green-400' : 'text-red-400'
                        }
                      >
                        {selectedDevice.online ? '● 온라인' : '● 오프라인'}
                      </dd>
                    </div>
                    {selectedDevice.posX !== null && (
                      <div className="flex justify-between">
                        <dt>좌표</dt>
                        <dd className="font-mono text-neutral-300">
                          {(selectedDevice.posX * 100).toFixed(1)}%,{' '}
                          {((selectedDevice.posY ?? 0) * 100).toFixed(1)}%
                        </dd>
                      </div>
                    )}
                  </dl>
                  {editMode && selectedDevice.posX !== null && (
                    <button
                      type="button"
                      className="btn-secondary mt-3 w-full text-xs"
                      onClick={() => onUnplace(selectedDevice.id)}
                    >
                      도면에서 제거
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

function DeviceListPanel({
  title,
  devices,
  editMode,
  placingDeviceId,
  onBeginPlace,
  onSelect,
  selectedDeviceId,
}: {
  title: string;
  devices: SpatialDevice[];
  editMode: boolean;
  placingDeviceId: string | null;
  onBeginPlace(id: string): void;
  onSelect(id: string): void;
  selectedDeviceId: string | null;
}) {
  return (
    <section className="card p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {title} · {devices.length}
      </h3>
      {devices.length === 0 ? (
        <div className="text-[11px] text-neutral-600">—</div>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
          {devices.map((d) => {
            const isPlacing = placingDeviceId === d.id;
            const isSelected = selectedDeviceId === d.id;
            return (
              <li key={d.id}>
                <div
                  className={`flex items-center justify-between rounded px-2 py-1 ${
                    isSelected ? 'bg-brand-500/10' : 'hover:bg-neutral-800/60'
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelect(d.id)}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                          d.online ? 'bg-green-400' : 'bg-red-400'
                        }`}
                      />
                      <span className="truncate text-neutral-200">{d.name}</span>
                    </div>
                    <div className="text-[9px] text-neutral-500">{d.category}</div>
                  </button>
                  {editMode && (
                    <button
                      type="button"
                      className={`ml-1 rounded px-1.5 py-0.5 text-[9px] ${
                        isPlacing
                          ? 'bg-brand-500 text-neutral-950'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                      onClick={() => onBeginPlace(d.id)}
                    >
                      {isPlacing ? '배치 중…' : '배치'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MetaPill({
  label,
  value,
  tone = 'mute',
}: {
  label: string;
  value: number;
  tone?: 'mute' | 'brand' | 'warn' | 'bad';
}) {
  const color =
    tone === 'brand'
      ? 'text-brand-400'
      : tone === 'warn'
        ? 'text-amber-400'
        : tone === 'bad'
          ? 'text-red-400'
          : 'text-neutral-300';
  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/60 p-2 text-center">
      <div className="text-[9px] uppercase text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
