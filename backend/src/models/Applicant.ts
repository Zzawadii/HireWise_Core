import mongoose, { Schema, Document } from 'mongoose';

export interface IApplicant extends Document {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string;
  education: string;
  resumeUrl: string;
  jobId: mongoose.Types.ObjectId;
  // AI scoring breakdown
  score: number;
  rank: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  relevanceScore: number;
  cultureFitScore: number;
  // AI analysis
  strengths: string[];
  gaps: string[];
  skillHighlights: string[];
  recommendation: string;
  interviewQuestions: string[];
  status: string;
}

const ApplicantSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  skills: [{ type: String }],
  experience: { type: String },
  education: { type: String },
  resumeUrl: { type: String },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  // AI scoring breakdown
  score: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  skillScore: { type: Number, default: 0 },
  experienceScore: { type: Number, default: 0 },
  educationScore: { type: Number, default: 0 },
  relevanceScore: { type: Number, default: 0 },
  cultureFitScore: { type: Number, default: 0 },
  // AI analysis
  strengths: [{ type: String }],
  gaps: [{ type: String }],
  skillHighlights: [{ type: String }],
  recommendation: { type: String },
  interviewQuestions: [{ type: String }],
  status: { type: String, default: 'pending' }
}, { timestamps: true });

export default mongoose.model<IApplicant>('Applicant', ApplicantSchema);