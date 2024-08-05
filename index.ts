import express, { Request, Response } from 'express';
import sharp from 'sharp';
import axios from 'axios';
import cors from 'cors';
import { fapp } from './config/firebase';
import { getStorage, ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import dotenv from 'dotenv';
import color from 'color';

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

async function getTextColorFromImage(imageBuffer: Buffer): Promise<string> {
  const image = sharp(imageBuffer);
  const { dominant } = await image.stats();
  const dominantColor = color({ r: dominant.r, g: dominant.g, b: dominant.b });
  return dominantColor.luminosity() > 0.5 ? '#000000' : '#FFFFFF';
}

function processContent(content: string): string {
  const lines = content.split('\n').map(line => line.trim());
  let processedContent = '';

  for (const line of lines) {
    if (line.startsWith('- ')) {
      processedContent += `<tspan x="350" dy="1.2em">• ${line.slice(2)}</tspan>`;
    } else if (line.startsWith('**') && line.endsWith('**')) {
      processedContent += `<tspan x="350" dy="1.2em" font-weight="bold">${line.slice(2, -2)}</tspan>`;
    } else {
      processedContent += `<tspan x="350" dy="1.2em">${line}</tspan>`;
    }
  }

  return processedContent;
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
  let textColor = '#FFFFFF';  // Default white for good contrast on darker backgrounds

  if (imageUrl) {
    const imageBuffer = await fetchImageBuffer(imageUrl);
    let resizedImageBuffer: Buffer;

    switch (type) {
      case 'withBackground':
        resizedImageBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'cover' })
          .toBuffer();
        overlay.push({ input: resizedImageBuffer, top: 0, left: 0 });
        textColor = await getTextColorFromImage(resizedImageBuffer);
        break;
      case 'topLeftImage':
        resizedImageBuffer = await sharp(imageBuffer)
          .resize(300, 300, { fit: 'contain' })
          .toBuffer();
        overlay.push({ input: resizedImageBuffer, top: 30, left: 30 });
        break;
      case 'splitView':
        resizedImageBuffer = await sharp(imageBuffer)
          .resize(width / 2, height, { fit: 'cover' })
          .toBuffer();
        overlay.push({ input: resizedImageBuffer, top: 0, left: 0 });
        break;
      default:
        break;
    }
  }

  const processedContent = processContent(content);

  const svgText = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="340" y="30" width="800" height="500" fill="rgba(0, 0, 0, 0.5)" />
      <style>
        .title { font: bold 50px sans-serif; fill: ${textColor}; }
        .content { font: 30px sans-serif; fill: ${textColor}; }
        .brand { font: bold 24px sans-serif; fill: ${textColor}; }
      </style>
      <text x="350" y="80" class="title">${title}</text>
      <text x="350" y="150" class="content">${processedContent}</text>
      <text x="350" y="${height - 60}" class="brand">Your Brand</text>
    </svg>
  `);
  overlay.push({ input: svgText, top: 0, left: 0 });

  return background.composite(overlay).png().toBuffer();
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
