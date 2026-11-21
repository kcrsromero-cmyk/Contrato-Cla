import { Notifier } from '../domain/Notifier';

export class NotifierRegistry {
  private static notifiers = new Map<string, Notifier>();
  private static defaultNotifierName = 'apprise';

  /**
   * Registers a notifier under a specific name.
   */
  static register(name: string, notifier: Notifier): void {
    this.notifiers.set(name, notifier);
  }

  /**
   * Resolves a notifier by name. If no name is provided, returns the default notifier.
   */
  static resolve(name?: string): Notifier {
    const targetName = name || this.defaultNotifierName;
    const notifier = this.notifiers.get(targetName);

    if (!notifier) {
      throw new Error(`Notifier '${targetName}' is not registered.`);
    }

    return notifier;
  }
}
