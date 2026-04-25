import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractTextFromPDF } from "./pdfService";

export const screenApplicants = async (job: any, applicants: any[]) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Extract PDF text for all applicants in parallel
  const applicantsWithResumes = await Promise.all(
    applicants.map(async (a) => {
      let resumeText = '';
      if (a.resumeUrl) {
        resumeText = await extractTextFromPDF(a.resumeUrl);
      }
      return { ...a._doc, resumeText };
    })
  );

  const prompt = `
You are an expert recruiter AI. Analyze these applicants for the following job and return a ranked shortlist.

JOB DETAILS:
Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.skills?.join(', ')}
Experience Required: ${job.experience}
Education Required: ${job.education}

APPLICANTS:
${applicantsWithResumes.map((a, i) => `
Applicant ${i + 1}:
- Name: ${a.name}
- Email: ${a.email}
- Skills: ${a.skills?.join(', ')}
- Experience: ${a.experience}
- Education: ${a.education}
- Resume URL: ${a.resumeUrl ? a.resumeUrl : 'Not provided'}
- Resume Content: ${a.resumeText ? a.resumeText.substring(0, 1000) : 'Not available'}
`).join('\n')}

Instructions:
- If resume content is available, use it to enrich your analysis
- Score each candidate from 0-100 based on fit to the job
- Be objective and explainable in your reasoning

Return a JSON array of ALL candidates ranked by match score. For each candidate include:
- name
- score (0-100)
- strengths (array of strings)
- gaps (array of strings)
- recommendation (string)
- rank (number)

Return ONLY the JSON array, no other text.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  console.log('Gemini response:', text);

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};