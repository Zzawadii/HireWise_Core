import express from 'express';
import { createJob, getJobs, getJob, updateJob, deleteJob } from '../controllers/jobController';
import auth from '../middleware/auth';
import { validate } from '../middleware/validate';
import { jobSchema } from '../validators/schemas';

const router = express.Router();

router.post('/', auth, validate(jobSchema), createJob);
router.get('/', getJobs);
router.get('/:id', getJob);
router.put('/:id', auth, validate(jobSchema), updateJob);
router.delete('/:id', auth, validate(jobSchema), deleteJob);

export default router;