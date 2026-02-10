// ✅ FINAL — LoginForm
// src/features/auth/components/LoginForm.tsx

import type { FC, FormEvent } from "react";

type Props = {
  role: "student" | "admin";
  setRole: (v: "student" | "admin") => void;

  username: string;
  setUsername: (v: string) => void;

  password: string;
  setPassword: (v: string) => void;

  isLoading: boolean;
  isUnderCooldown: boolean;

  doLogin: () => void;
};

const LoginForm: FC<Props> = ({
  role,
  setRole,
  username,
  setUsername,
  password,
  setPassword,
  isLoading,
  isUnderCooldown,
  doLogin,
}) => {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoading && !isUnderCooldown) doLogin();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto p-6 bg-gray-900 rounded-2xl shadow-xl text-white space-y-6"
    >
      {/* role selector */}
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "student" | "admin")}
        disabled={isUnderCooldown || isLoading}
        className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="student">Student</option>
        <option value="admin">Admin / Educator</option>
      </select>

      {/* username */}
      <input
        type="text"
        placeholder="Username / Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={isUnderCooldown || isLoading}
        required
        className="p-3 w-full bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />

      {/* password */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isUnderCooldown || isLoading}
        required
        className="p-3 w-full bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={isLoading || isUnderCooldown}
        className="p-3 w-full bg-blue-600 rounded hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isUnderCooldown
          ? "Wait…"
          : isLoading
          ? "Processing…"
          : "Login"}
      </button>
    </form>
  );
};

export default LoginForm;
