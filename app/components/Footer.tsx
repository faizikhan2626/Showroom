"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { FaTwitter, FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FiMail, FiPhone, FiMapPin } from "react-icons/fi";

const baseLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Stock", href: "/stock" },
  { name: "Sales", href: "/sales" },
  { name: "Search", href: "/search" },
];

export default function Footer() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const showroomName = session?.user?.showroomName || "Showroom Management";

  const links = isAdmin
    ? [...baseLinks, { name: "Add New Users", href: "/admin/create-showroom-user" }]
    : baseLinks;

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Branding Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center space-x-2 group"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="text-2xl font-bold gradient-text bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  {showroomName}
                </span>
              </Link>
              <p className="mt-4 text-gray-300 max-w-md leading-relaxed">
                Your trusted partner in vehicle management. Streamlining showroom operations 
                with modern technology and exceptional service.
              </p>
              
              {/* Social Media */}
              <div className="flex space-x-4 mt-6">
                {[
                  { icon: FaTwitter, href: "https://twitter.com", color: "hover:text-blue-400" },
                  { icon: FaFacebookF, href: "https://facebook.com", color: "hover:text-blue-500" },
                  { icon: FaInstagram, href: "https://instagram.com", color: "hover:text-pink-400" },
                  { icon: FaLinkedinIn, href: "https://linkedin.com", color: "hover:text-blue-600" },
                ].map((social, index) => (
                  <motion.a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 ${social.color} transition-all duration-200`}
                  >
                    <social.icon size={18} />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-white mb-6 relative">
              Quick Links
              <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
            </h3>
            <ul className="space-y-3">
              {links.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 flex items-center space-x-2 group"
                  >
                    <div className="w-1 h-1 bg-blue-500 rounded-full group-hover:w-2 transition-all duration-200"></div>
                    <span>{link.name}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-white mb-6 relative">
              Contact Info
              <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-300">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <FiMail className="text-blue-400" size={16} />
                </div>
                <span className="text-sm">support@showroom.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <FiPhone className="text-green-400" size={16} />
                </div>
                <span className="text-sm">+92 123 456 7890</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <FiMapPin className="text-red-400" size={16} />
                </div>
                <span className="text-sm">Karachi, Pakistan</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 pt-8 border-t border-gray-700"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} {showroomName}. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Support
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-l from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-full blur-3xl"></div>
    </motion.footer>
  );
}
