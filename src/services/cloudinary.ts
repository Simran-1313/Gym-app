import axios from 'axios';
import api from './api';

interface UploadSignatureResponse {
  success: boolean;
  data: {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  };
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function uploadToCloudinary(
  uri: string,
  folder = 'gym-chat',
): Promise<CloudinaryUploadResult> {
  const sigRes = await api.get<UploadSignatureResponse>(`/upload/signature?folder=${folder}`);
  const { signature, timestamp, cloudName, apiKey, folder: backendFolder } = sigRes.data.data;

  const filename = uri.split('/').pop() || 'chat-image.jpg';
  const extMatch = /\.(\w+)$/.exec(filename);
  const mime = extMatch ? `image/${extMatch[1] === 'jpg' ? 'jpeg' : extMatch[1]}` : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mime } as unknown as Blob);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', backendFolder);

  const uploadRes = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return {
    secure_url: uploadRes.data.secure_url,
    public_id: uploadRes.data.public_id,
  };
}
