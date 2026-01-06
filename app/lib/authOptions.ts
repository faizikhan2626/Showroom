import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "./db";
import User from "./models/User";
import bcrypt from "bcryptjs";
import { AuthOptions, SessionStrategy } from "next-auth";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("Authorize called with:", {
          username: credentials?.username,
          password: credentials?.password ? "[REDACTED]" : undefined,
        });

        try {
          await connectToDatabase();
          console.log("Database connected");
          const user = await User.findOne({ username: credentials?.username });
          console.log(
            "User found:",
            user
              ? {
                  username: user.username,
                  passwordHash: user.password,
                  role: user.role,
                }
              : "No user found"
          );

          if (!user) return null;

          const isValid = await bcrypt.compare(
            credentials?.password || "",
            user.password
          );
          console.log("Password valid:", isValid);
          if (!isValid) return null;

          const userData = {
            id: user._id.toString(),
            name: user.username,
            email: `${user.username}@example.com`,
            role: user.role,
            showroomName: user.showroomName,
            showroomId: user._id.toString(),
          };
          console.log("Returning user:", userData);
          return userData;
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 60 * 60 * 12,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.showroomName = user.showroomName;
        token.showroomId = user.showroomId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.showroomName = token.showroomName;
        session.user.showroomId = token.showroomId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};
