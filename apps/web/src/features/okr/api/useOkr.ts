import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateKeyResultDto,
  CreateObjectiveDto,
  UpdateKeyResultDto,
  UpdateObjectiveDto,
} from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { KeyResultRow, ObjectiveRow } from '../types';

const LIST_KEY = ['okr', 'objectives'] as const;

export function useObjectivesList(period: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, period ?? 'all'],
    queryFn: async (): Promise<ObjectiveRow[]> => {
      const res = await apiClient.get<ObjectiveRow[]>('/okr/objectives', {
        params: period ? { period } : undefined,
      });
      return res.data;
    },
  });
}

// ---- objective mutations ----

export function useCreateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateObjectiveDto): Promise<ObjectiveRow> => {
      const res = await apiClient.post<ObjectiveRow>('/okr/objectives', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateObjective(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateObjectiveDto): Promise<ObjectiveRow> => {
      const res = await apiClient.patch<ObjectiveRow>(`/okr/objectives/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/okr/objectives/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

// ---- key-result mutations ----

export function useAddKeyResult(objectiveId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateKeyResultDto): Promise<KeyResultRow> => {
      const res = await apiClient.post<KeyResultRow>(
        `/okr/objectives/${objectiveId}/key-results`,
        dto,
      );
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      dto: UpdateKeyResultDto;
    }): Promise<KeyResultRow> => {
      const res = await apiClient.patch<KeyResultRow>(
        `/okr/key-results/${payload.id}`,
        payload.dto,
      );
      return res.data;
    },
    // Optimistic progress bump so the slider feels instant.
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      const snapshots: Array<[readonly unknown[], ObjectiveRow[] | undefined]> = [];
      qc.getQueriesData<ObjectiveRow[]>({ queryKey: LIST_KEY }).forEach(([key, data]) => {
        snapshots.push([key, data]);
        if (!data) return;
        qc.setQueryData<ObjectiveRow[]>(
          key,
          data.map((obj) => ({
            ...obj,
            keyResults: obj.keyResults.map((kr) =>
              kr.id === payload.id ? { ...kr, ...payload.dto } : kr,
            ),
            progress: computeObjectiveProgress(
              obj.keyResults.map((kr) =>
                kr.id === payload.id ? { ...kr, ...payload.dto } : kr,
              ),
            ),
          })),
        );
      });
      return { snapshots };
    },
    onError: (_err, _payload, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/okr/key-results/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

/**
 * Client-side mirror of the server's deriveProgress(). Used ONLY for the
 * optimistic cache update in useUpdateKeyResult — the final authority is
 * still the server's response on settle.
 */
function computeObjectiveProgress(
  keyResults: Array<{ progress?: number }>,
): number {
  if (keyResults.length === 0) return 0;
  const sum = keyResults.reduce((s, kr) => s + (kr.progress ?? 0), 0);
  return Math.floor(sum / keyResults.length);
}
