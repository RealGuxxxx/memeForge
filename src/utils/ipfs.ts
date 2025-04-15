import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const FILEBASE_ACCESS_KEY = process.env.NEXT_PUBLIC_FILEBASE_ACCESS_KEY || '';
const FILEBASE_SECRET_KEY = process.env.NEXT_PUBLIC_FILEBASE_SECRET_KEY || '';
const FILEBASE_BUCKET = process.env.NEXT_PUBLIC_FILEBASE_BUCKET || '';

const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  credentials: {
    accessKeyId: FILEBASE_ACCESS_KEY,
    secretAccessKey: FILEBASE_SECRET_KEY,
  },
  region: 'us-east-1',
  forcePathStyle: true,
});

export const uploadToIPFS = async (file: File): Promise<string> => {
  try {
    console.log('开始上传文件:', file.name);
    console.log('文件类型:', file.type);
    console.log('文件大小:', file.size);

    const key = `images/${Date.now()}-${file.name}`;
    console.log('生成的文件键:', key);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: FILEBASE_BUCKET,
        Key: key,
        Body: file,
        ContentType: file.type,
        ACL: 'public-read',
      },
    });

    const result = await upload.done();
    console.log('上传完成:', result);
    
    // 获取对象的CID
    try {
      const headObjectCommand = new HeadObjectCommand({
        Bucket: FILEBASE_BUCKET,
        Key: key,
      });
      
      const headResponse = await s3Client.send(headObjectCommand);
      const cid = headResponse.Metadata?.['cid'];
      
      if (cid) {
        console.log('获取到文件CID:', cid);
        return cid; // 返回IPFS CID而不是key
      } else {
        console.warn('无法从元数据中获取CID，使用S3 URL作为替代');
        return key;
      }
    } catch (headError) {
      console.error('获取对象CID失败:', headError);
      return key; // 如果获取CID失败，回退到使用key
    }
  } catch (error: any) {
    console.error('上传到 Filebase 失败:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw new Error(`上传文件失败: ${error.message}`);
  }
};

export const getIPFSUrl = (key: string): string => {
  // 检查传入的key是否已经是一个CID (标准IPFS CID通常以Qm或baf开头)
  if (key.startsWith('Qm') || key.startsWith('baf')) {
    // 这是一个IPFS CID
    const url = `https://ipfs.io/ipfs/${key}`;
    console.log('使用IPFS网关URL:', url);
    return url;
  } else {
    // 这是一个S3路径，使用Filebase S3 URL
    const url = `https://${FILEBASE_BUCKET}.s3.filebase.com/${key}`;
    console.log('使用Filebase S3 URL:', url);
    return url;
  }
}; 