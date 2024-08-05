import express, { Request, Response } from 'express';
import sharp from 'sharp';
import axios from 'axios';
import cors from 'cors';
import { fapp } from './config/firebase';
import { getStorage, ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

interface OgImageParams {
  title: string;
  content: string;
  imageUrl?: string;
  type: 'default' | 'withBackground' | 'topLeftImage' | 'splitView';
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}

async function generateOgImage({ title, content, imageUrl, type }: OgImageParams): Promise<Buffer> {
  const width = 1200;
  const height = 630;

  let background = sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });

  let overlay: sharp.OverlayOptions[] = [];

  if (imageUrl) {
    try {
      const imageBuffer = await fetchImageBuffer(imageUrl);
      let resizedImage;

      switch (type) {
        case 'withBackground':
          resizedImage = await sharp(imageBuffer)
            .resize(width, height, { fit: 'cover' })
            .toBuffer();
          overlay.push({ input: resizedImage, top: 0, left: 0 });
          break;
        case 'topLeftImage':
          resizedImage = await sharp(imageBuffer)
            .resize(300, 300, { fit: 'contain' })
            .toBuffer();
          overlay.push({ input: resizedImage, top: 50, left: 50 });
          break;
        case 'splitView':
          resizedImage = await sharp(imageBuffer)
            .resize(width / 2, height, { fit: 'cover' })
            .toBuffer();
          overlay.push({ input: resizedImage, top: 0, left: 0 });
          break;
      }
    } catch (error) {
      console.error('Error processing background image URL:', error);
    }
  }

  const svgBuffer = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font: bold 50px sans-serif; fill: #1f2937; }
        .content { font: 30px sans-serif; fill: #4b5563; }
        .brand { font: bold 24px sans-serif; fill: #3b82f6; }
      </style>
      ${type === 'topLeftImage' ? '<rect x="0" y="0" width="400" height="400" fill="rgba(255,255,255,0.7)" />' : ''}
      <text x="${type === 'splitView' ? width / 2 + 60 : 60}" y="120" class="title">${title}</text>
      <text x="${type === 'splitView' ? width / 2 + 60 : 60}" y="200" class="content">${content}</text>
      <text x="${type === 'splitView' ? width / 2 + 60 : 60}" y="${height - 60}" class="brand">Your Brand</text>
    </svg>
  `);

  overlay.push({ input: svgBuffer, top: 0, left: 0 });

  return background
    .composite(overlay)
    .png()
    .toBuffer();
}

app.post('/generate-og-image', async (req: Request, res: Response) => {
  try {
    const { title, content, imageUrl, type } = req.body as OgImageParams;

    if (!title || !content || !type) {
      return res.status(400).json({ error: 'Title, content, and type are required' });
    }

    const imageBuffer = await generateOgImage({ title, content, imageUrl, type });
    const fileName = `og-images/${title}-${Date.now()}.png`;

    const storage = getStorage(fapp);
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytesResumable(storageRef, imageBuffer, {
      contentType: 'image/png'
    });

    const publicUrl = await getDownloadURL(snapshot.ref);

    res.json({ imageUrl: publicUrl });
  } catch (error) {
    console.error('Error generating or uploading OG image:', error);
    res.status(500).json({ error: 'Failed to generate or upload OG image', details: (error as Error).message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export default app;