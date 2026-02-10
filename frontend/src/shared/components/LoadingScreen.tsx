// ✅ src/shared/components/LoadingScreen.tsx
import { Loader2 } from "lucide-react";

export const LoadingScreen = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">
          Loading application...
        </p>
      </div>
    </div>
  );
};
