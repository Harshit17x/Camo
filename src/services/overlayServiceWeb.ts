/**
 * Web / iOS stub for the RideOverlay plugin.
 * All methods are no-ops so the app compiles fine on non-Android platforms.
 */
export class RideOverlayWeb {
  async checkPermission() {
    return { granted: false };
  }

  async requestPermission() {
    return { granted: false };
  }

  async showOverlay(_options: any) {
    // No-op on web
  }

  async dismissOverlay() {
    // No-op on web
  }

  async addListener(_event: string, _handler: any) {
    return { remove: () => {} };
  }

  async removeAllListeners() {
    // No-op on web
  }

  async getPendingAction() {
    return {};
  }
}
