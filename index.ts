import express, { Request, Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

interface OgImageParams {
  title: string;
  content: string;
  imageUrl?: string;
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}

async function generateOgImage({ title, content, imageUrl }: OgImageParams): Promise<Buffer> {
  const width = 1200;
  const height = 630;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4338ca;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="#ffffff" rx="20" ry="20"/>
      <text x="60" y="120" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="#1f2937">${title}</text>
      <text x="60" y="200" font-family="Arial, sans-serif" font-size="30" fill="#4b5563">${content}</text>
      <text x="60" y="${height - 60}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#3b82f6">Your Brand</text>
    </svg>
  `;

  let image = sharp(Buffer.from(svg));

  if (imageUrl) {
    try {
      const imageBuffer = await fetchImageBuffer(imageUrl);
      const overlay = await sharp(imageBuffer)
        .resize(300, 300, { fit: 'inside' })
        .toBuffer();

      image = image.composite([
        { input: overlay, top: 260, left: 840, gravity: 'southeast' }
      ]);
    } catch (error) {
      console.error('Error processing image URL:', error);
    }
  }

  return image
    .png()
    .toBuffer();
}

app.post('/generate-og-image', async (req: Request, res: Response) => {
  try {
    const { title, content, imageUrl } = req.body as OgImageParams;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const imageBuffer = await generateOgImage({ title, content, imageUrl });

    const fileName = `og-image-${Date.now()}.png`;
    const filePath = path.join(__dirname, 'public', fileName);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, imageBuffer);

    res.json({ imageUrl: `/${fileName}` });
  } catch (error) {
    console.error('Error generating OG image:', error);
    res.status(500).json({ error: 'Failed to generate OG image' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});