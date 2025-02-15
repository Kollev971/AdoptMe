import { Router } from 'express';
import { setAdminRole } from '../firebase-admin';

const router = Router();

router.post('/api/admin/setup', async (req, res) => {
  try {
    const adminEmail = 'delyank97@gmail.com';
    const success = await setAdminRole(adminEmail);

    if (success) {
      res.status(200).json({ message: `Successfully set admin role for ${adminEmail}` });
    } else {
      res.status(500).json({ error: 'Failed to set admin role' });
    }
  } catch (error: any) {
    console.error('Error in admin setup:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;