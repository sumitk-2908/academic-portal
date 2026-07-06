import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recent Uploads",
};

export default function RecentUploadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
