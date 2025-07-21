// app/lib/next-auth.d.ts
import { User as AuthUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      username: string;
      role: "admin" | "showroom";
      showroomName: string;
      showroomId: string;
    };
  }

  interface User extends AuthUser {
    username: string;
    role: "admin" | "showroom";
    showroomName: string;
    showroomId: string;
  }
}
