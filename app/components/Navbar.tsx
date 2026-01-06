"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiMenu, 
  FiX, 
  FiHome, 
  FiPackage, 
  FiTrendingUp, 
  FiSearch, 
  FiUserPlus, 
  FiLogOut,
  FiUser,
  FiChevronDown
} from "react-icons/fi";

const baseLinks = [
  { name: "Dashboard", href: "/dashboard", icon: FiHome },
  { name: "Stock", href: "/stock", icon: FiPackage },
  { name: "Sales", href: "/sales", icon: FiTrendingUp },
  { name: "Search", href: "/search", icon: FiSearch },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
        { name: "Add New Users", href: "/admin/create-showroom-user", icon: FiUserPlus },
      ]
    : baseLinks;

  const showroomName = session?.user?.showroomName || "Showroom Management";

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center space-x-3 group"
          >
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <FiHome className="text-white text-xl" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {showroomName}
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`text-lg ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-blue-500"}`} />
                  <span>{link.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-50 rounded-xl border border-blue-200"
                      style={{ zIndex: -1 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Menu & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {/* User Menu (Desktop) */}
            {isAuthenticated && (
              <div className="hidden md:block relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <FiUser className="text-white text-sm" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {session?.user?.username || "User"}
                  </span>
                  <FiChevronDown className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{session?.user?.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{session?.user?.role} User</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <FiLogOut className="text-lg" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
            >
              {open ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <div className="px-4 py-4 space-y-2">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`text-lg ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
              
              {isAuthenticated && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="px-4 py-2 mb-2">
                    <p className="text-sm font-medium text-gray-900">{session?.user?.username}</p>
                    <p className="text-xs text-gray-500 capitalize">{session?.user?.role} User</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <FiLogOut className="text-lg" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}