import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Inbox",
};

export default function AdminInboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
