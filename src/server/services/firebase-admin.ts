// Mock Firebase Admin for development
// In production, use real Firebase Admin SDK with service account

export const admin = {
  auth: () => ({
    verifyIdToken: async (token: string) => {
      // Mock verification for development
      // In production, this would verify real Firebase tokens
      if (token === 'demo-token') {
        return {
          uid: 'demo-user-firebase-uid',
          email: 'demo@example.com',
        };
      }
      throw new Error('Invalid token');
    },
  }),
};