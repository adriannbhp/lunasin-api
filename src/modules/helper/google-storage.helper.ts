import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

export async function uploadToBucket(
  file: Express.Multer.File,
  userId?: string,
): Promise<string> {
  const keyFileContent = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
  const credentials = JSON.parse(keyFileContent);
  const storage = new Storage({ credentials });

  const bucketName = process.env.GOOGLE_BUCKET_NAME;
  const bucket = storage.bucket(bucketName);

  const finalUserId = userId || process.env.DEFAULT_USER_ID;

  const fileName = `${finalUserId}/${uuidv4()}_${file.originalname}`;
  const blob = bucket.file(fileName);

  const stream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (err) => reject(err));

    stream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    stream.end(file.buffer);
  });
}
