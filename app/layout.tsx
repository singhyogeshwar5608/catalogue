import RootLayoutClient from "./RootLayoutClient";
import { metadata, viewport } from "./layout-metadata";

export { metadata, viewport };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootLayoutClient>{children}</RootLayoutClient>;
}
