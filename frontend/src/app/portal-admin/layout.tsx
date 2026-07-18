import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default function PortalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
