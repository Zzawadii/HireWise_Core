import { Request, Response } from 'express';
import csv from 'csv-parser';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import Applicant from '../models/Applicant';

const parseRow = (row: any, jobId: string) => ({
  name: row.name || row.Name || row.NAME,
  email: row.email || row.Email || row.EMAIL,
  phone: row.phone || row.Phone || row.PHONE || '',
  skills: String(row.skills || row.Skills || row.SKILLS || '')
    .split(',').map((s: string) => s.trim()).filter(Boolean),
  experience: row.experience || row.Experience || row.EXPERIENCE || '',
  education: row.education || row.Education || row.EDUCATION || '',
  resumeUrl: row.resumeUrl || row.resume_url || row.ResumeUrl || row.resume || '',
  jobId,
  status: 'pending'
});

const saveApplicants = async (results: any[], errors: any[], res: Response) => {
  const duplicates: string[] = [];

  for (const applicant of results) {
    try {
      await Applicant.create(applicant);
    } catch (err: any) {
      if (err.code === 11000) {
        duplicates.push(applicant.email);
      }
    }
  }

  res.status(201).json({
    message: 'File uploaded successfully',
    total: results.length,
    inserted: results.length - duplicates.length,
    duplicates: duplicates.length > 0 ? duplicates : undefined,
    skipped: errors.length + duplicates.length,
    errors: errors.length > 0 ? errors : undefined
  });
};

export const uploadCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const jobId  = req.params.jobId as string;
    const results: any[] = [];
    const errors: any[] = [];
    const mimetype = req.file.mimetype;

    // Handle Excel files
    if (
      mimetype === 'application/vnd.ms-excel' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      for (const row of rows) {
        const applicant = parseRow(row, jobId);
        if (!applicant.name || !applicant.email) {
          errors.push({ row, reason: 'Missing name or email' });
        } else {
          results.push(applicant);
        }
      }

      return await saveApplicants(results, errors, res);
    }

    // Handle CSV files
    const stream = Readable.from(req.file.buffer.toString());
    stream
      .pipe(csv())
      .on('data', (row) => {
        const applicant = parseRow(row, jobId);
        if (!applicant.name || !applicant.email) {
          errors.push({ row, reason: 'Missing name or email' });
        } else {
          results.push(applicant);
        }
      })
      .on('end', async () => {
        await saveApplicants(results, errors, res);
      })
      .on('error', (err) => {
        res.status(400).json({ message: 'Failed to parse CSV', error: err.message });
      });

  } catch (err: any) {
    console.error('uploadCSV error:', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};