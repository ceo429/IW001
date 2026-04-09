import type { GuideDeviceType } from '@iw001/shared';

export interface AsGuideRow {
  id: string;
  deviceType: GuideDeviceType | string;
  symptom: string;
  rootCause: string;
  action: string;
  tips: string | null;
  caseCount: number;
  createdAt: string;
  updatedAt: string;
}
