import express, { Request, Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

interface OgImageParams {
  title: string;
  content: string;
  imageUrl?: string;
}

async function generateOgImage({ title, content, imageUrl }: OgImageParams): Promise<Buffer> {
  const width = 1200;
  const height = 630;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="60" y="100" font-family="Arial" font-size="50" font-weight="bold" fill="#1f2937">${title}</text>
      <text x="60" y="180" font-family="Arial" font-size="30" fill="#4b5563">${content}</text>
      <text x="1000" y="600" font-family="Arial" font-size="30" font-weight="bold" fill="#3b82f6">Your Brand</text>
    </svg>
  `;

  let image = sharp(Buffer.from(svg));

  if (imageUrl) {
    const overlay = await sharp(imageUrl)
      .resize(300, 300, { fit: 'inside' })
      .toBuffer();

    image = image.composite([
      { input: overlay, top: 330, left: 900 }
    ]);
  }

  return image.png().toBuffer();
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
    
    await fs.mkdir(path.dirname(filePath), { recursive: true }); // Ensure the directory exists
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
