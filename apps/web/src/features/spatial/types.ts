export interface SpatialDevice {
  id: string;
  name: string;
  category: string;
  online: boolean;
  posX: number | null;
  posY: number | null;
}

export interface SpatialHome {
  id: string;
  name: string;
  floorPlanSvg: string | null;
  customer: { id: string; name: string } | null;
  devices: SpatialDevice[];
}
