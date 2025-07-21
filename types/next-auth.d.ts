import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      showroomName: string;
      showroomId: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    showroomName: string;
    showroomId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    role: string;
    showroomName: string;
    showroomId: string;
  }
}
