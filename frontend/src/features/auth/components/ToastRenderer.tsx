import React from "react";

export type Toast = {
  id: number;
  msg: string;
  type: "success" | "error" | "countdown";
  endTime?: number; // optional for countdown UI
};

type Props = {
  toasts: Toast[];
  removeToast: (id: number) => void;
};

const ToastRenderer: React.FC<Props> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-4 w-[95%] max-w-3xl pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className={`
            pointer-events-auto
            relative
            px-8 py-6 
            rounded-3xl shadow-2xl text-white font-bold text-center text-lg
            transition-all duration-200 cursor-pointer
            ${
              t.type === "error"
                ? "bg-gradient-to-r from-red-500 via-pink-500 to-purple-500"
                : "bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400"
            }
          `}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
};

export default ToastRenderer;
