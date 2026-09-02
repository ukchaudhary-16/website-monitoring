import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "DePIN Monitor",
  description: "Decentralized website uptime monitoring by a global validator network",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
