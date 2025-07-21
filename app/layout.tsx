import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import AuthProvider from "./components/AuthProvider";
import LayoutWithNavbar from "./components/LayoutWithNavbar";
import { Toaster } from "react-hot-toast";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "Showroom Management System",
  description: "Manage your vehicle showroom with ease.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LayoutWithNavbar>{children}</LayoutWithNavbar>
          <Toaster position="top-center" />
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
