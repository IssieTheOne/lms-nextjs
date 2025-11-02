require('dotenv').config({ path: '.env.local' });

const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;

async function testCloudflare() {
  try {
    // Upload a test file
    const key = 'test-file.txt';
    const body = 'This is a test file for Cloudflare R2 validation.';
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
    }));
    console.log('Upload test passed');

    // List objects
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
    }));
    console.log('List test passed, objects:', listResponse.Contents ? listResponse.Contents.length : 0);

    // Delete the test file
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    console.log('Delete test passed');

    return true;
  } catch (err) {
    console.error('Cloudflare test failed:', err.message);
    return false;
  }
}

testCloudflare();