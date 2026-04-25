import { Request, Response } from 'express';
import Applicant from '../models/Applicant';
import Job from '../models/Job';
import { screenApplicants } from '../services/aiService';

export const addApplicant = async (req: Request, res: Response) => {
  try {
    const applicant = new Applicant({ ...req.body, jobId: req.params.jobId });
    await applicant.save();
    res.status(201).json(applicant);
  } catch (err: any) {
    console.error('addApplicant error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Applicant with this email already exists for this job' });
    }
    res.status(500).json({ message: 'Failed to add applicant', error: err.message });
  }
};

export const getApplicants = async (req: Request, res: Response) => {
  try {
    const applicants = await Applicant.find({ jobId: req.params.jobId });
    res.json({ total: applicants.length, data: applicants });
  } catch (err: any) {
    console.error('getApplicants error:', err);
    res.status(500).json({ message: 'Failed to fetch applicants', error: err.message });
  }
};

export const screenJobApplicants = async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const applicants = await Applicant.find({ jobId: req.params.jobId });
    if (applicants.length === 0) return res.status(400).json({ message: 'No applicants found for this job' });

    const results = await screenApplicants(job, applicants);

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

    res.json({ message: 'Screening complete', total: results.length, results });
  } catch (err: any) {
    console.error('screenJobApplicants error:', err);
    res.status(500).json({ message: 'AI screening failed', error: err.message });
  }
};

export const getShortlist = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const total = await Applicant.countDocuments({ jobId: req.params.jobId, status: 'screened' });
    const shortlist = await Applicant.find({ 
      jobId: req.params.jobId, 
      status: 'screened' 
    }).sort({ score: -1 }).skip(skip).limit(limit);

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: shortlist
    });
  } catch (err: any) {
    console.error('getShortlist error:', err);
    res.status(500).json({ message: 'Failed to fetch shortlist', error: err.message });
  }
};