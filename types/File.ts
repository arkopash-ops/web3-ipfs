export interface FileMetadata {
    fileName: string;
    fileType: string;
    fileSize: number;
    description?: string;
    tags?: string[];
    cid: string;
    uploadedAt: number;
    walletAddress?: string;
}
