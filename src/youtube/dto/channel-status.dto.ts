export class ChannelStatusDto {
  connected: boolean;
  channelId?: string;
  channelTitle?: string;
  needsReauth: boolean;
  cookiesAgeSec?: number;
}
