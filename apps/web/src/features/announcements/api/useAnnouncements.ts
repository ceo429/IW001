import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { AnnouncementRow } from '../types';

const LIST_KEY = ['announcements', 'list'] as const;

export function useAnnouncementsList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async (): Promise<AnnouncementRow[]> => {
      const res = await apiClient.get<AnnouncementRow[]>('/announcements');
      return res.data;
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAnnouncementDto): Promise<AnnouncementRow> => {
      const res = await apiClient.post<AnnouncementRow>('/announcements', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateAnnouncement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateAnnouncementDto): Promise<AnnouncementRow> => {
      const res = await apiClient.patch<AnnouncementRow>(`/announcements/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
