import jwt from 'jsonwebtoken';

describe('Auth & Refresh Token Utilities', () => {
  const JWT_SECRET = 'test_access_secret';
  const JWT_REFRESH_SECRET = 'test_refresh_secret';

  it('should generate valid 15-minute access token', () => {
    const userId = '507f1f77bcf86cd799439011';
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '15m' });
    
    expect(token).toBeDefined();
    const decoded: any = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe(userId);
    expect(decoded.exp - decoded.iat).toBe(15 * 60);
  });

  it('should generate valid 7-day refresh token', () => {
    const userId = '507f1f77bcf86cd799439011';
    const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    expect(refreshToken).toBeDefined();
    const decoded: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    expect(decoded.id).toBe(userId);
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });

  it('should reject invalid or tampered refresh tokens', () => {
    const fakeToken = 'invalid.jwt.token';
    expect(() => {
      jwt.verify(fakeToken, JWT_REFRESH_SECRET);
    }).toThrow();
  });
});
