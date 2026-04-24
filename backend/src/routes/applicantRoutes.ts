import express from 'express';
import { addApplicant, getApplicants, screenJobApplicants, getShortlist } from '../controllers/applicantController';
import auth from '../middleware/auth';

const router = express.Router({ mergeParams: true });

router.post('/', auth, addApplicant);
router.get('/', getApplicants);
router.post('/screen', auth, screenJobApplicants);
router.get('/shortlist', getShortlist);

export default router;