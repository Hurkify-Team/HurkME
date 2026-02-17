import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private readonly bucket = process.env.S3_BUCKET ?? '';
  private readonly publicBaseUrl = process.env.S3_PUBLIC_BASE_URL ?? '';

  private getClient(): S3Client | null {
    if (!this.bucket || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      return null;
    }

    return new S3Client({
      region: process.env.AWS_REGION ?? 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async presignUpload(fileName: string, contentType: string) {
    const key = `proof/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${fileName}`;

    const client = this.getClient();
    if (!client) {
      return {
        key,
        uploadUrl: `https://example.com/mock-upload/${encodeURIComponent(key)}`,
        publicUrl: `https://example.com/mock-public/${encodeURIComponent(key)}`,
        mocked: true,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 10 });

    const publicUrl = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : uploadUrl.split('?')[0];

    return {
      key,
      uploadUrl,
      publicUrl,
      mocked: false,
    };
  }
}
