import NextAuth from "next-auth";
import { authOptions } from "../../../lib/authOptions"; // ✅ use shared config

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
