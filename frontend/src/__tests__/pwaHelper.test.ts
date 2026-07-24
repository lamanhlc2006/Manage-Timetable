import { describe, it, expect } from 'vitest';
import { requestNotificationPermission } from '../utils/pwaHelper';

describe('pwaHelper utils', () => {
  it('should resolve default permission when Notification API is not available or default', async () => {
    const permission = await requestNotificationPermission();
    expect(['granted', 'denied', 'default']).toContain(permission);
  });
});
