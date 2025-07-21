// app/auth/error/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthErrorPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/login"), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-500 mb-4">
          Authentication Error
        </h1>
        <p className="mb-4">
          There was an error during authentication. Please try again.
        </p>
        <p>You will be redirected to the login page shortly...</p>
      </div>
    </div>
  );
}
