import { User } from '../models/User';

export const seedDatabase = async (): Promise<void> => {
  try {
    const adminEmail = 'admin@example.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: adminEmail,
        password: 'admin123',
        role: 'admin',
      });
      console.log('Seeded admin user successfully (admin@example.com / admin123)');
    }

    const userEmail = 'user@example.com';
    const userExists = await User.findOne({ email: userEmail });
    if (!userExists) {
      await User.create({
        username: 'user',
        email: userEmail,
        password: 'user123',
        role: 'user',
      });
      console.log('Seeded regular user successfully (user@example.com / user123)');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
