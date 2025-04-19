
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key } from "lucide-react";
import { useApiKey } from "@/hooks/useApiKey";
import { toast } from "sonner";

export const ApiKeyInput = () => {
  const { apiKey, updateApiKey } = useApiKey();
  const [tempKey, setTempKey] = useState(apiKey);
  const [isVisible, setIsVisible] = useState(false);

  const handleSave = () => {
    updateApiKey(tempKey);
    toast.success("API key saved successfully");
    setIsVisible(false);
  };

  if (!isVisible && !apiKey) {
    return (
      <Button 
        variant="outline" 
        onClick={() => setIsVisible(true)}
        className="w-full mb-4"
      >
        <Key className="h-4 w-4 mr-2" />
        Set Gemini API Key
      </Button>
    );
  }

  if (!isVisible) return null;

  return (
    <div className="flex gap-2 mb-4">
      <Input
        type="password"
        value={tempKey}
        onChange={(e) => setTempKey(e.target.value)}
        placeholder="Enter your Gemini API key"
      />
      <Button onClick={handleSave}>Save</Button>
    </div>
  );
};
