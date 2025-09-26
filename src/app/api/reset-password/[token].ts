import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@libsql/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Initialize database client
const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { token } = req.query;
  const { password } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Missing or invalid token' });
  }

  try {
    // Decode the JWT to get the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };

    // Look up the user in the database
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [decoded.id],
    });

    const user = result.rows[0];
    if (
      !user ||
      user.reset_password_token !== token ||
      !user.reset_password_expires ||
      Number(user.reset_password_expires) < Date.now()
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the user's password
    await client.execute({
      sql: `UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?`,
      args: [hashedPassword, user.id],
    });

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password Reset Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
