// app/admin/create-showroom-user/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

interface User {
  username: string;
  role: "admin" | "showroom";
  showroomName: string;
  showroomId: string;
}

export default function CreateShowroomUserPage() {
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showroomName, setShowroomName] = useState("");
  const [role, setRole] = useState<"admin" | "showroom">("showroom");
  const [users, setUsers] = useState<User[]>([]);

  // Fetch non-admin users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        // Filter out admins
        setUsers(data.filter((user: User) => user.role === "showroom"));
      } catch (err) {
        toast.error("Failed to load users", {
          style: {
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #ef4444",
          },
        });
      }
    };
    fetchUsers();
  }, []);

  if (!session?.user || session.user.role !== "admin") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto mt-20 p-6 bg-red-100 text-red-700 rounded-lg shadow-md text-center"
      >
        Access Denied
      </motion.div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Creating user...", {
      style: {
        background: "#f0f9ff",
        color: "#1e40af",
        border: "1px solid #3b82f6",
      },
    });

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, showroomName, role }),
      });

      const contentType = res.headers.get("content-type");
      let data: { message: string } = { message: "" };
      if (contentType?.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) {
        toast.error(data.message || "Failed to create user", {
          id: toastId,
          style: {
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #ef4444",
          },
        });
      } else {
        toast.success("User created successfully!", {
          id: toastId,
          style: {
            background: "#dcfce7",
            color: "#15803d",
            border: "1px solid #22c55e",
          },
        });
        setUsername("");
        setPassword("");
        setShowroomName("");
        setRole("showroom");
        // Refresh user list
        const resUsers = await fetch("/api/admin/users");
        const newUsers = await resUsers.json();
        setUsers(newUsers.filter((user: User) => user.role === "showroom"));
      }
    } catch (err) {
      toast.error("Unexpected server error", {
        id: toastId,
        style: {
          background: "#fee2e2",
          color: "#b91c1c",
          border: "1px solid #ef4444",
        },
      });
    }
  };

  const handleDelete = async (showroomId: string, username: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${username} and their vehicles?`
      )
    )
      return;
    const toastId = toast.loading(`Deleting ${username}...`, {
      style: {
        background: "#f0f9ff",
        color: "#1e40af",
        border: "1px solid #3b82f6",
      },
    });

    try {
      const res = await fetch(
        `/api/admin/delete-user?showroomId=${showroomId}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to delete user", {
          id: toastId,
          style: {
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #ef4444",
          },
        });
      } else {
        toast.success("User and vehicles deleted successfully!", {
          id: toastId,
          style: {
            background: "#dcfce7",
            color: "#15803d",
            border: "1px solid #22c55e",
          },
        });
        setUsers(users.filter((user) => user.showroomId !== showroomId));
      }
    } catch (err) {
      toast.error("Unexpected server error", {
        id: toastId,
        style: {
          background: "#fee2e2",
          color: "#b91c1c",
          border: "1px solid #ef4444",
        },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-md mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg border border-blue-100"
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-t-xl">
        <h2 className="text-2xl font-bold tracking-tight">
          Manage Showroom Accounts
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Username
          </label>
          <motion.input
            initial={{ scale: 1 }}
            whileFocus={{ scale: 1.02, borderColor: "#3b82f6" }}
            transition={{ duration: 0.2 }}
            className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Password
          </label>
          <motion.input
            initial={{ scale: 1 }}
            whileFocus={{ scale: 1.02, borderColor: "#3b82f6" }}
            transition={{ duration: 0.2 }}
            className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Showroom Name
          </label>
          <motion.input
            initial={{ scale: 1 }}
            whileFocus={{ scale: 1.02, borderColor: "#3b82f6" }}
            transition={{ duration: 0.2 }}
            className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter showroom name"
            value={showroomName}
            onChange={(e) => setShowroomName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Role
          </label>
          <motion.select
            initial={{ scale: 1 }}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "showroom")}
          >
            <option value="showroom">Showroom</option>
            <option value="admin">Admin</option>
          </motion.select>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          type="submit"
        >
          Create Account
        </motion.button>
      </form>
      <div className="p-6">
        <h3 className="text-lg font-medium text-blue-700 mb-4">
          Showroom Users
        </h3>
        {users.length === 0 ? (
          <p className="text-gray-500">No showroom users found.</p>
        ) : (
          <ul className="space-y-3">
            {users.map((user) => (
              <motion.li
                key={user.showroomId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium">{user.username}</span> (
                  {user.showroomName})
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  onClick={() => handleDelete(user.showroomId, user.username)}
                >
                  Delete
                </motion.button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
