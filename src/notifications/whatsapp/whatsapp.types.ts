import type { WASocket } from 'baileys';

export interface ActiveSocket {
  sock: WASocket;
  instanceId: string;
  phoneNumber?: string;
  connectedAt: Date;
}

export type ConnectionMethod = 'qr' | 'pairing';

export interface ConnectionRequest {
  method: ConnectionMethod;
  phoneNumber?: string;
}

export interface QRResponse {
  method: 'qr';
  qr: string;
  qrDataUrl?: string;
}

export interface PairingResponse {
  method: 'pairing';
  pairingCode: string;
}

export interface ReconnectingResponse {
  status: 'reconnecting';
  message: string;
}

export type ConnectionResponse =
  | QRResponse
  | PairingResponse
  | ReconnectingResponse;

export interface ConnectionStatus {
  status: string;
  phoneNumber?: string;
  lastConnectedAt?: string;
  lastError?: string;
}
