import express from 'express';
import { createJob, getJobs, getJob, updateJob, deleteJob } from '../controllers/jobController';
import auth from '../middleware/auth';

const router = express.Router();

router.post('/', auth, createJob);
router.get('/', getJobs);
router.get('/:id', getJob);
router.put('/:id', auth, updateJob);
router.delete('/:id', auth, deleteJob);

export default router;