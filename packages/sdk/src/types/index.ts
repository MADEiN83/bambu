export type Region = "EU" | "US" | "CN";

/**
 * Live print status reported by the cloud `devices()` endpoint.
 *
 * Use the {@link PrintStatus} const for type-safe comparisons:
 * @example
 * ```ts
 * if (device.print_status === PrintStatus.RUNNING) { ... }
 * ```
 */
export const PrintStatus = {
  IDLE: "IDLE",
  PREPARE: "PREPARE",
  RUNNING: "RUNNING",
  PAUSE: "PAUSE",
  FINISH: "FINISH",
  FAILED: "FAILED",
  OFFLINE: "OFFLINE",
  UNKNOWN: "UNKNOWN",
} as const;
export type PrintStatus = (typeof PrintStatus)[keyof typeof PrintStatus];

/**
 * Numeric status reported on a {@link PrintTask}. Values come from Bambu cloud.
 */
export const TaskStatus = {
  RUNNING: 1,
  FINISHED: 2,
  CANCELED: 3,
  FAILED: 4,
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface BambuTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
}

export interface BambuDevice {
  dev_id: string;
  name: string;
  online: boolean;
  print_status: PrintStatus;
  print_job: number;
  dev_model_name: string;
  dev_product_name: string;
  dev_access_code: string;
  nozzle_diameter: number;
  dev_structure: string;
}

export interface BambuDeviceStatus {
  dev_id: string;
  dev_name: string;
  dev_model_name: string;
  dev_product_name: string;
  dev_online: boolean;
  dev_access_code: string;
}

export interface BambuStatusResponse {
  message: string;
  code: number;
  error: string | null;
  devices: BambuDeviceStatus[];
}

export interface AmsDetailMapping {
  ams: number;
  sourceColor: string;
  targetColor: string;
  filamentId: string;
  filamentType: string;
  targetFilamentType: string;
  weight: number;
  nozzleId: number;
  amsId: number;
  slotId: number;
}

export interface AmsMapping2 {
  amsId: number;
  slotId: number;
}

export interface PrintTaskMaterial {
  id: string;
  name: string;
}

export interface PrintTaskConfig {
  name: string;
  url: string;
}

export interface PrintTaskCompatibility {
  devModelName: string;
  devProductName: string;
  nozzleDiameter: number;
}

export interface PrintTaskModelInfo {
  configs: PrintTaskConfig[];
  compatibility: PrintTaskCompatibility;
}

export interface PrintTaskExtention {
  modelInfo: PrintTaskModelInfo;
}

export interface PrintTask {
  id: number;
  designId: number;
  designTitle: string;
  designTitleTranslated: string;
  instanceId: number;
  modelId: string;
  title: string;
  cover: string;
  status: TaskStatus;
  failedType: number;
  feedbackStatus: number;
  startTime: string;
  endTime: string;
  weight: number;
  length: number;
  costTime: number;
  profileId: number;
  plateIndex: number;
  plateName: string;
  deviceId: string;
  amsDetailMapping: AmsDetailMapping[];
  mode: string;
  isPublicProfile: boolean;
  isPrintable: boolean;
  isDelete: boolean;
  deviceModel: string;
  deviceName: string;
  bedType: string;
  jobType: number;
  material: PrintTaskMaterial;
  platform: string;
  stepSummary: unknown[];
  nozzleInfos: unknown[];
  nozzleMapping: unknown;
  snapShot: string;
  extention: PrintTaskExtention;
  filamentSettingIds: string[];
  enableFilamentDynamicMap: number;
  repetitions: number;
  useAms: boolean;
  pauseType: number;
  matchFilamentMode: string;
  amsMapping: number[];
  amsMapping2: AmsMapping2[];
}
