"use client";

import { useState, useRef } from "react";
import { Button, Window, WindowHeader, WindowContent } from "react95";
import { uploadToIPFS, getIPFSUrl } from "../utils/ipfs";

interface ImageUploaderProps {
  onUploadSuccess: (hash: string) => void;
}

export const ImageUploader = ({ onUploadSuccess }: ImageUploaderProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    // 验证文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      return;
    }

    // 创建预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      setError(null);
      const hash = await uploadToIPFS(file);
      onUploadSuccess(hash);
    } catch (err: any) {
      setError(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Window className="w-full max-w-md">
      <WindowHeader>上传图片</WindowHeader>
      <WindowContent>
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            fullWidth
          >
            {uploading ? "上传中..." : "选择图片"}
          </Button>

          {error && (
            <div
              style={{
                padding: "0.5rem",
                backgroundColor: "#ffd2d2",
                color: "#d32f2f",
                borderRadius: "4px",
              }}
            >
              {error}
            </div>
          )}

          {previewUrl && (
            <div className="mt-4">
              <p className="mb-2">预览：</p>
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-48 object-contain"
              />
            </div>
          )}
        </div>
      </WindowContent>
    </Window>
  );
};
