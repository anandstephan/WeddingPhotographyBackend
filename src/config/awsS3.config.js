import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";

class s3ServiceWithProgress {
    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }

    async uploadFile(file, path, progressCallback) {
        const upload = new Upload({
            client: this.s3Client,
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: path,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: "public-read",
                Metadata: {
                    "original-filename": file.originalname,
                    "upload-date": new Date().toISOString(),
                },
                ServerSideEncryption: "AES256",
            },
            queueSize: 4,
            partSize: 5 * 1024 * 1024,
            leavePartsOnError: false,
        });
    
        if (progressCallback) {
            upload.on("httpUploadProgress", (progress) => {
                const percentage = Math.round((progress.loaded * 100) / progress.total);
                progressCallback(percentage);
            });
        }
    
        try {
            const result = await upload.done();
            return {
                url: result.Location,
                key: result.Key,
                versionId: result.VersionId,
                etag: result.ETag,
            };
        } catch (error) {
            if (error.name === "AbortError") {
                console.log("Upload aborted");
            }
            throw error;
        }
    }

    // Example of handling multiple files with progress tracking
    async uploadMultipleFiles(files, progressCallback) {
        const uploads = files.map(file => {
            const path = `uploads/${Date.now()}_${file.originalname}`;

            const upload = new Upload({
                client: this.s3Client,
                params: {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: path,
                    Body: file.buffer,
                    ContentType: file.mimetype
                },
                queueSize: 2, // Limit concurrent uploads per file
                partSize: 5 * 1024 * 1024
            });

            // Track progress for each file
            upload.on("httpUploadProgress", (progress) => {
                const percentage = Math.round((progress.loaded * 100) / progress.total);
                progressCallback(file.originalname, percentage);
            });

            return upload.done();
        });

        return Promise.all(uploads);
    }
}

export default s3ServiceWithProgress;