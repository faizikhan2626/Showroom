import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      name?: string | null;
      email?: string | null;
      role: "admin" | "showroom";
      showroomName: string;
      showroomId: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: "admin" | "showroom";
    showroomName: string;
    showroomId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "admin" | "showroom";
    showroomName: string;
    showroomId: string;
  }
}
