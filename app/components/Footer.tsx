"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { FaTwitter, FaFacebookF, FaInstagram } from "react-icons/fa";

const baseLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Stock", href: "/stock" },
  { name: "Sales", href: "/sales" },
  { name: "Search", href: "/search" },
];

export default function Footer() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const showroomName = session?.user?.showroomName || "SM";

  // Conditionally add "Add New Users" link for admins
  const links = isAdmin
    ? [
        ...baseLinks,
        { name: "Add New Users", href: "/admin/create-showroom-user" },
      ]
    : baseLinks;

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8 mt-12"
    >
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Branding Section */}
        <div>
          <Link
            href="/"
            className="text-2xl font-extrabold text-white tracking-wider hover:scale-105 transition-transform duration-300"
          >
            {showroomName}
          </Link>
          <p className="mt-2 text-sm text-blue-100">
            Your trusted destination for quality vehicles.
          </p>
        </div>

        {/* Navigation Links */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
          <ul className="space-y-2">
            {links.map((link) => (
              <motion.li
                key={link.href}
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href={link.href}
                  className="text-blue-100 hover:text-white transition-colors duration-300"
                >
                  {link.name}
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Social Media & Contact */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Connect With Us
          </h3>
          <div className="flex space-x-4 mb-4">
            <motion.a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="text-blue-100 hover:text-white"
            >
              <FaTwitter size={24} />
            </motion.a>
            <motion.a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="text-blue-100 hover:text-white"
            >
              <FaFacebookF size={24} />
            </motion.a>
            <motion.a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="text-blue-100 hover:text-white"
            >
              <FaInstagram size={24} />
            </motion.a>
          </div>
          <p className="text-sm text-blue-100">
            Email: support@{showroomName.toLowerCase().replace(/\s+/g, "")}.com
          </p>
          <p className="text-sm text-blue-100">Phone: +92 123 456 7890</p>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-8 border-t border-blue-500 pt-4 text-center">
        <p className="text-sm text-blue-100">
          &copy; {new Date().getFullYear()} {showroomName}. All rights reserved.
        </p>
      </div>
    </motion.footer>
  );
}
