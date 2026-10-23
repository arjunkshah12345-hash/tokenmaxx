export type Period = "hourly" | "daily" | "weekly" | "monthly";

export type ProviderCategory =
  | "hub"
  | "ide"
  | "subscription"
  | "api"
  | "agent"
  | "cli";

/** Stable string ids — see PROVIDERS in providers.ts */
export type ProviderId = string;

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface ProviderDef {
  id: ProviderId;
  name: string;
  blurb: string;
  /** Named dither-kit palette colour for accents */
  tint: "green" | "blue" | "orange" | "red" | "pink" | "grey";
  category: ProviderCategory;
  /** Included when T3 Code linkup autoconnects */
  viaT3: boolean;
}

export interface Connection {
  providerId: ProviderId;
  status: ConnectionStatus;
  connectedAt?: string;
  lastSyncAt?: string;
  tokensSynced: number;
  source: "manual" | "t3-linkup" | "demo";
}

export interface Player {
  id: string;
  handle: string;
  avatarHue: number;
  isYou?: boolean;
  connections: Connection[];
  totals: Record<Period, number>;
  lifetime: number;
  updatedAt: string;
}

export interface StoreShape {
  youId: string;
  players: Player[];
  windows: Record<Period, string>;
  lastTickAt: string;
}
