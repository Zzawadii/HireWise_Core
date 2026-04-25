import axios from 'axios';

export const extractTextFromPDF = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    const buffer = Buffer.from(response.data);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (err) {
    console.error('PDF extraction failed:', err);
    return '';
  }
};