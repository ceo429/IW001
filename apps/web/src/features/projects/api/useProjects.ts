import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProjectDto,
  CreateTaskDto,
  ProjectStatus,
  UpdateProjectDto,
  UpdateTaskDto,
} from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { ProjectDetail, ProjectRow, TaskRow } from '../types';

const LIST_KEY = ['projects', 'list'] as const;
const DETAIL_KEY = (id: string) => ['projects', 'detail', id] as const;

/** GET /projects */
export function useProjectsList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async (): Promise<ProjectRow[]> => {
      const res = await apiClient.get<ProjectRow[]>('/projects');
      return res.data;
    },
  });
}

/** GET /projects/:id */
export function useProjectDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? DETAIL_KEY(id) : ['projects', 'detail', 'noop'],
    enabled: !!id,
    queryFn: async (): Promise<ProjectDetail> => {
      const res = await apiClient.get<ProjectDetail>(`/projects/${id}`);
      return res.data;
    },
  });
}

// ---- Project mutations ----

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateProjectDto): Promise<ProjectRow> => {
      const res = await apiClient.post<ProjectRow>('/projects', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateProjectDto): Promise<ProjectRow> => {
      const res = await apiClient.patch<ProjectRow>(`/projects/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

// ---- Task mutations ----

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTaskDto): Promise<TaskRow> => {
      const res = await apiClient.post<TaskRow>(`/projects/${projectId}/tasks`, dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(projectId) });
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; dto: UpdateTaskDto }): Promise<TaskRow> => {
      const res = await apiClient.patch<TaskRow>(`/tasks/${payload.id}`, payload.dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(projectId) });
    },
  });
}

export function useMoveTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; to: ProjectStatus }): Promise<TaskRow> => {
      const res = await apiClient.post<TaskRow>(`/tasks/${payload.id}/move`, {
        to: payload.to,
      });
      return res.data;
    },
    // Optimistic update — flip the status locally so the card snaps to
    // the new column before the network round-trip completes.
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: DETAIL_KEY(projectId) });
      const previous = qc.getQueryData<ProjectDetail>(DETAIL_KEY(projectId));
      if (previous) {
        qc.setQueryData<ProjectDetail>(DETAIL_KEY(projectId), {
          ...previous,
          tasks: previous.tasks.map((t) =>
            t.id === payload.id ? { ...t, status: payload.to } : t,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(DETAIL_KEY(projectId), ctx.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(projectId) });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(projectId) });
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
