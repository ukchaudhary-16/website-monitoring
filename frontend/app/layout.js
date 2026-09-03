import "./globals.css";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  title: "DePIN Monitor — decentralized uptime monitoring",
  description:
    "Website uptime monitoring by a global network of independent validator nodes that render your pages and reach on-chain consensus.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Nav />
        <main>{children}</main>
        <footer className="footer">
          DePIN Monitor · validator-network uptime monitoring · college major project
        </footer>
      </body>
    </html>
  );
}
