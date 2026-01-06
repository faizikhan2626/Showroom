import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      name?: string;
      email?: string;
      role: "admin" | "showroom";
      showroomName: string;
      showroomId: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "showroom";
    showroomName: string;
    showroomId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    role: "admin" | "showroom";
    showroomName: string;
    showroomId: string;
  }
}
