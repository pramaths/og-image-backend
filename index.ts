import express, { Request, Response } from 'express';
import sharp from 'sharp';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import {fapp} from './config/firebase'
import { getStorage, ref , getDownloadURL, uploadBytesResumable } from "firebase/storage";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(express.json());

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

  let background = sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  if (imageUrl) {
    try {
      const imageBuffer = await fetchImageBuffer(imageUrl);
      background = sharp(imageBuffer)
        .resize(width, height)
        .flatten({ background: '#fff' });  // Ensures no transparency
    } catch (error) {
      console.error('Error processing background image URL:', error);
    }
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="120" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="#1f2937" stroke="#ffffff" stroke-width="1px">${title}</text>
      <text x="60" y="200" font-family="Arial, sans-serif" font-size="30" fill="#4b5563">${content}</text>
      <text x="60" y="${height - 60}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#3b82f6">Your Brand</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);
  
  return background
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
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
    const fileName = `og-images/${title}-${Date.now()}.png`; // Create a unique file name

    const storage = getStorage(fapp);
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytesResumable(storageRef, imageBuffer, {
      contentType: 'image/png'
    });

    const publicUrl = await getDownloadURL(snapshot.ref);

    res.json({ imageUrl: publicUrl });
  } catch (error) {
    console.error('Error generating or uploading OG image:', error);
    res.status(500).json({ error: 'Failed to generate or upload OG image' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export default app;
