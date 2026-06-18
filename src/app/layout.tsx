import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turn2Law Intern Tracker",
  description: "Internal team management system — track tasks, standups, attendance, and performance for 50+ interns across the company.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
