"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import Image from "next/image";

const baseLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Stock", href: "/stock" },
  { name: "Sales", href: "/sales" },
  { name: "Search", href: "/search" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = status === "authenticated";
  const isAdmin = session?.user?.role === "admin";

  // Conditionally add "Add New Users" link for admins
  const links = isAdmin
    ? [
        ...baseLinks,
        { name: "Add New Users", href: "/admin/create-showroom-user" },
      ]
    : baseLinks;

  // Use showroomName from session, fallback to "SM" if not available
  const showroomName = session?.user?.showroomName || "SM";

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-700 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"
      } bg-white/90 backdrop-blur-md border-b border-blue-500 shadow-md`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        {/* Logo (Showroom Name) */}
        <Link
          href="/"
          className="text-2xl font-extrabold text-blue-700 tracking-wider hover:scale-105 transition-transform duration-300"
        >
          <Image
            src={`/images/logo.jpeg`}
            alt="Showroom Logo"
            width={120}
            height={120}
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-8 relative">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative group text-sm font-medium transition-colors duration-300 pb-2 ${
                pathname === link.href
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-500"
              }`}
            >
              {link.name}
              {pathname === link.href && (
                <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-blue-600 rounded-full animate-slide-in" />
              )}
              <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-blue-400 rounded-full group-hover:w-full transition-all duration-300" />
            </Link>
          ))}

          {/* Login/Logout Button */}
          {isAuthenticated ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-4 px-4 py-1.5 rounded bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => signIn()}
              className="ml-4 px-4 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Login
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-blue-700 hover:scale-110 transition-transform duration-300"
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden px-6 overflow-hidden transition-all duration-500 ease-in-out ${
          open ? "max-h-96 py-2 opacity-100" : "max-h-0 py-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`text-base font-medium transition-colors duration-300 ${
                pathname === link.href
                  ? "text-blue-600 font-semibold"
                  : "text-gray-700 hover:text-blue-500"
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Login/Logout Button (Mobile) */}
          {isAuthenticated ? (
            <button
              onClick={() => {
                signOut({ callbackUrl: "/login" });
                setOpen(false);
              }}
              className="text-red-600 font-medium text-left"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => {
                signIn();
                setOpen(false);
              }}
              className="text-blue-600 font-medium text-left"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
