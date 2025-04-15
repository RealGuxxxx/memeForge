"use client";
import { useState, useRef } from "react";
import { Button, TextInput } from "react95";

interface UserAvatarProps {
  currentAvatar?: string;
  onAvatarChange: (avatar: string) => void;
}

export const UserAvatar = ({
  currentAvatar,
  onAvatarChange,
}: UserAvatarProps) => {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || "");
  const [isUrlInput, setIsUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        onAvatarChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setAvatarUrl(url);
    onAvatarChange(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="用户头像"
            className="w-32 h-32 rounded-full object-cover"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">无头像</span>
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-2">
        {isUrlInput ? (
          <div className="space-y-2">
            <TextInput
              value={avatarUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="输入头像URL"
              fullWidth
            />
            <Button onClick={() => setIsUrlInput(false)} size="sm">
              选择文件
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              fullWidth
            >
              上传头像
            </Button>
            <Button onClick={() => setIsUrlInput(true)} size="sm" fullWidth>
              使用URL
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
