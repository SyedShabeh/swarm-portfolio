import type { Metadata } from "next";
import "./globals.css";
import "./final-theme.css";
import { PortfolioRuntime } from "../src/components/PortfolioRuntime";

export const metadata: Metadata = { title: "Cursor Swarm Playground", description: "Interactive Canvas cursor-arrow swarm" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}<PortfolioRuntime /></body></html>; }
