import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TEN — The Entrepreneurship Network | Internship Portal",
  description: "A professional internship platform for tomorrow's entrepreneurs. Real projects, real mentorship, real results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body>
        <div className="ten-grid-bg"></div>
        <div className="ten-orb ten-orb-1"></div>
        <div className="ten-orb ten-orb-2"></div>
        {children}
      </body>
    </html>
  );
}
