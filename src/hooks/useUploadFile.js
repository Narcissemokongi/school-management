// src/hooks/useUploadFile.js
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export function useUploadFile(userId) {
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadFile = async (file) => {
    setError(null);
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ userId });

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!res.ok) {
        throw new Error(`Upload échoué (${res.status})`);
      }

      const { storageId } = await res.json();
      const url = `${import.meta.env.VITE_CONVEX_URL}/api/storage/${storageId}`;

      return {
        url,
        nom: file.name,
        type: file.type,
        taille: file.size,
      };
    } catch (e) {
      setError(e.message ?? "Erreur upload");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadFile, error };
}