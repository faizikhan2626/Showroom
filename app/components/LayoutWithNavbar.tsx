"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import { ReactNode } from "react";

export default function LayoutWithNavbar({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  return (
    <>
      {!isLoginPage && <Navbar />}
      <main className="">{children}</main>
    </>
  );
}
