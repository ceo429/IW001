export interface HomeStatusRow {
  id: string;
  name: string;
  address: string | null;
  customer: { id: string; name: string };
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  /** 0..100 with one decimal place. */
  onlineRate: number;
}

export interface HomesOverview {
  siteCount: number;
  deviceCount: number;
  onlineCount: number;
  onlineRate: number;
}

export interface HomeDetail extends HomeStatusRow {
  customer: {
    id: string;
    name: string;
    ceoName: string | null;
    phone: string | null;
  };
  devices: Array<{
    id: string;
    externalId: string;
    name: string;
    category: string;
    model: string | null;
    online: boolean;
    battery: number | null;
    lastSeenAt: string | null;
  }>;
  _count: {
    devices: number;
    asTickets: number;
    maintenanceJobs: number;
  };
}
