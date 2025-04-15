"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Button,
  Window,
  WindowHeader,
  WindowContent,
  TextInput,
} from "react95";
import { UserAvatar } from "./UserAvatar";

export const UserProfile = () => {
  const { user, updateUserInfo, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nickname: user?.nickname || "",
    avatar: user?.avatar || "",
    bio: user?.bio || "",
  });

  if (!user) {
    return null;
  }

  const handleSubmit = async () => {
    try {
      await updateUserInfo(user.id, formData);
      setIsEditing(false);
    } catch (error) {
      console.error("更新用户信息失败:", error);
    }
  };

  return (
    <Window className="w-full max-w-md">
      <WindowHeader className="flex justify-between items-center">
        <span>用户资料</span>
      </WindowHeader>
      <WindowContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block mb-1">昵称</label>
              <TextInput
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                fullWidth
              />
            </div>
            <div>
              <label className="block mb-1">头像</label>
              <UserAvatar
                currentAvatar={formData.avatar}
                onAvatarChange={(avatar) =>
                  setFormData({ ...formData, avatar })
                }
              />
            </div>
            <div>
              <label className="block mb-1">个人简介</label>
              <TextInput
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                fullWidth
                multiline
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsEditing(false)} disabled={isLoading}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                保存
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-bold">昵称</label>
              <p>{user.nickname}</p>
            </div>
            <div>
              <label className="block mb-1 font-bold">头像</label>
              <UserAvatar
                currentAvatar={user.avatar}
                onAvatarChange={() => {}}
              />
            </div>
            <div>
              <label className="block mb-1 font-bold">个人简介</label>
              <p>{user.bio}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsEditing(true)}>编辑资料</Button>
            </div>
          </div>
        )}
      </WindowContent>
    </Window>
  );
};
