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
  score: number;
  rank: number;
  strengths: string[];
  gaps: string[];
  recommendation: string;
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
  score: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  strengths: [{ type: String }],
  gaps: [{ type: String }],
  recommendation: { type: String },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

export default mongoose.model<IApplicant>('Applicant', ApplicantSchema);