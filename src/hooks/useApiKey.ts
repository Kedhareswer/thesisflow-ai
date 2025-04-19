
import { useState, useEffect } from "react";

export const useApiKey = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key") || "";
  });

  const updateApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem("gemini_api_key", newKey);
  };

  return { apiKey, updateApiKey };
};
