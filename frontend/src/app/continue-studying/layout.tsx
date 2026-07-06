import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Continue Studying",
};

export default function ContinueStudyingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
