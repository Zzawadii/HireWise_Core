import express from 'express';
import { addApplicant, getApplicants, screenJobApplicants, getShortlist } from '../controllers/applicantController';
import { uploadCSV } from '../controllers/uploadController';
import auth from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import { aiScreeningLimiter } from '../middleware/rateLimiter';
import { applicantSchema } from '../validators/schemas';

const router = express.Router({ mergeParams: true });

router.post('/', auth, validate(applicantSchema), addApplicant);
router.get('/', getApplicants);
router.post('/upload-csv', auth, upload.single('file'), uploadCSV);
router.post('/screen', auth, aiScreeningLimiter, screenJobApplicants);
router.get('/shortlist', getShortlist);

export default router;