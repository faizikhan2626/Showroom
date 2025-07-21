import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "../../../lib/db";
import User from "../../../lib/models/User";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          await connectToDatabase();
          const user = await User.findOne({ username: credentials?.username });
          if (!user) return null;

          const isValid = await bcrypt.compare(
            credentials?.password || "",
            user.password
          );
          if (!isValid) return null;

          return {
            id: user._id.toString(),
            name: user.username,
            email: `${user.username}@example.com`,
            role: user.role,
            showroomName: user.showroomName,
            showroomId: user._id.toString(), // Use User._id as showroomId
          };
        } catch (error) {
          console.error("Authentication error:", error);
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
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12 hours
  },
  callbacks: {
    async session({ session, token }) {
      session.user = {
        name: token.name,
        email: token.email,
        id: token.id,
        role: token.role,
        showroomName: token.showroomName,
        showroomId: token.showroomId,
      };
      session.expires = session.expires;
      console.log("Session created:", session);
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.showroomName = user.showroomName;
        token.showroomId = user.showroomId;
      }
      console.log("Token created:", token);
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
