import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SpatialDevice, SpatialHome } from '../types';

const DETAIL_KEY = (id: string) => ['spatial', 'home', id] as const;

export function useSpatialHome(homeId: string | undefined) {
  return useQuery({
    queryKey: homeId ? DETAIL_KEY(homeId) : ['spatial', 'home', 'noop'],
    enabled: !!homeId,
    queryFn: async (): Promise<SpatialHome> => {
      const res = await apiClient.get<SpatialHome>(`/homes/${homeId}/spatial`);
      return res.data;
    },
  });
}

export function useSetFloorPlan(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (svg: string): Promise<void> => {
      await apiClient.put(`/homes/${homeId}/floor-plan`, { svg });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(homeId) });
    },
  });
}

export function useUpdateDevicePosition(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      deviceId: string;
      posX: number | null;
      posY: number | null;
    }): Promise<SpatialDevice> => {
      const res = await apiClient.patch<SpatialDevice>(
        `/homes/devices/${payload.deviceId}/position`,
        { posX: payload.posX, posY: payload.posY },
      );
      return res.data;
    },
    // Optimistic update — the marker snaps to its new spot immediately so
    // place / drag flows feel snappy.
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: DETAIL_KEY(homeId) });
      const previous = qc.getQueryData<SpatialHome>(DETAIL_KEY(homeId));
      if (previous) {
        qc.setQueryData<SpatialHome>(DETAIL_KEY(homeId), {
          ...previous,
          devices: previous.devices.map((d) =>
            d.id === payload.deviceId
              ? { ...d, posX: payload.posX, posY: payload.posY }
              : d,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(DETAIL_KEY(homeId), ctx.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(homeId) });
    },
  });
}
