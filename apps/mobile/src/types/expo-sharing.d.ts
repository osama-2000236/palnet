declare module "expo-sharing" {
  export interface SharingOptions {
    dialogTitle?: string;
    mimeType?: string;
    UTI?: string;
  }

  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string, options?: SharingOptions): Promise<void>;
}
