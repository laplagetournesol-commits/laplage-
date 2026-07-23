import { Router } from 'express';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { syncAgoraMenu } from '../lib/agora';

const router = Router();

/**
 * POST /api/menu/sync — resynchronise la carte (produits/familles) depuis la
 * caisse Ágora vers Supabase. Réservé admin. Préserve les interrupteurs.
 */
router.post('/sync', requireAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await syncAgoraMenu();
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Erreur sync menu Ágora:', err);
    res.status(500).json({ error: err?.message ?? 'Erreur de synchronisation' });
  }
});

export default router;
