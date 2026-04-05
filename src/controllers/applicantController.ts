import { Request, Response } from 'express';
import Applicant from '../models/Applicant';
import Job from '../models/Job';
import { screenApplicants } from '../services/aiService';

export const addApplicant = async (req: Request, res: Response) => {
  try {
    const applicant = new Applicant({ ...req.body, jobId: req.params.jobId });
    await applicant.save();
    res.status(201).json(applicant);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getApplicants = async (req: Request, res: Response) => {
  try {
    const applicants = await Applicant.find({ jobId: req.params.jobId });
    res.json(applicants);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const screenJobApplicants = async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const applicants = await Applicant.find({ jobId: req.params.jobId });
    if (applicants.length === 0) return res.status(400).json({ message: 'No applicants found' });

    const results = await screenApplicants(job, applicants);

    // Update each applicant with AI results
    for (const result of results) {
      await Applicant.findOneAndUpdate(
        { jobId: req.params.jobId, name: result.name },
        {
          score: result.score,
          rank: result.rank,
          strengths: result.strengths,
          gaps: result.gaps,
          recommendation: result.recommendation,
          status: 'screened'
        }
      );
    }

    res.json({ message: 'Screening complete', results });
  } catch (err) {
    console.error('Screening error:', err);
    res.status(500).json({ message: 'Server error', error: String(err) });
  }
};

export const getShortlist = async (req: Request, res: Response) => {
  try {
    const shortlist = await Applicant.find({ 
      jobId: req.params.jobId, 
      status: 'screened' 
    }).sort({ score: -1 }).limit(20);
    res.json(shortlist);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};