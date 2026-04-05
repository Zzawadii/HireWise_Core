export const screenApplicants = async (job: any, applicants: any[]) => {
  const prompt = `
You are an expert recruiter AI. Analyze these applicants for the following job and return a ranked shortlist.

JOB DETAILS:
Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.skills?.join(', ')}
Experience Required: ${job.experience}
Education Required: ${job.education}

APPLICANTS:
${applicants.map((a, i) => `
Applicant ${i + 1}:
- Name: ${a.name}
- Skills: ${a.skills?.join(', ')}
- Experience: ${a.experience}
- Education: ${a.education}
`).join('\n')}

Return a JSON array of the top candidates ranked by match score. For each candidate include:
- name
- score (0-100)
- strengths (array of strings)
- gaps (array of strings)
- recommendation (string)
- rank (number)

Return ONLY the JSON array, no other text.
`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.6-plus:free',
      messages: [{ role: 'user', content: prompt }]
    })
  });

 const data = await response.json() as any;
  
  // Debug - remove later
  console.log('OpenRouter response:', JSON.stringify(data));
  
  const text = data.choices[0].message.content;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};