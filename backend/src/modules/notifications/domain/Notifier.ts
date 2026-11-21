export interface Notifier {
  /**
   * @param recipient Channel-specific recipient identifier (for Telegram, the chat id).
   */
  send(recipient: string, message: string, title?: string): Promise<void>;
}
