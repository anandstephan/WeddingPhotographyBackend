import { S3Client, PutObjectCommand, CreateBucketCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';

class S3StorageManager {
    constructor(bucketName, region = 'us-east-1') {
        this.bucketName = bucketName;
        this.s3Client = new S3Client({
            region: region,
            credentials: fromEnv()
        });
    }

    // Create a new folder for user when they purchase a package
    async createUserFolder(mobileNumber) {
        try {
            // In S3, folders are actually zero-byte objects with a trailing slash
            const folderKey = `${mobileNumber}/`;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: folderKey,
                Body: ''
            });

            await this.s3Client.send(command);
            return {
                success: true,
                message: `Folder created successfully for user ${mobileNumber}`,
                folderPath: folderKey
            };
        } catch (error) {
            console.error('Error creating folder:', error);
            throw new Error(`Failed to create folder for user ${mobileNumber}`);
        }
    }

    // Upload a file to user's folder
    async uploadFile(mobileNumber, file, fileName) {
        try {
            const fileKey = `${mobileNumber}/${fileName}`;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileKey,
                Body: file,
                ContentType: file.mimetype
            });

            await this.s3Client.send(command);
            return {
                success: true,
                message: 'File uploaded successfully',
                fileUrl: `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`
            };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw new Error('Failed to upload file');
        }
    }

    // Get total space used by a user
    async getUserStorageUsage(mobileNumber) {
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: `${mobileNumber}/`
            });

            const response = await this.s3Client.send(command);
            let totalSize = 0;

            if (response.Contents) {
                totalSize = response.Contents.reduce((acc, obj) => acc + obj.Size, 0);
            }

            return {
                success: true,
                mobileNumber,
                totalSizeBytes: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
            };
        } catch (error) {
            console.error('Error getting storage usage:', error);
            throw new Error('Failed to get storage usage');
        }
    }

    // List all files in a user's folder
    async listUserFiles(mobileNumber) {
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: `${mobileNumber}/`
            });

            const response = await this.s3Client.send(command);

            const files = response.Contents
                ? response.Contents.map(file => ({
                    name: file.Key.split('/').pop(),
                    size: file.Size,
                    lastModified: file.LastModified,
                    url: `https://${this.bucketName}.s3.amazonaws.com/${file.Key}`
                }))
                : [];

            return {
                success: true,
                mobileNumber,
                files
            };
        } catch (error) {
            console.error('Error listing files:', error);
            throw new Error('Failed to list files');
        }
    }
}

export {S3StorageManager};
