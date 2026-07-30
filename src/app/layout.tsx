import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/lib/theme-context";
import { WorkerProvider } from "@/lib/worker-context";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-runway",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Runway — funded until when?",
  description:
    "Cash runway for daily-wage workers. Worst-case funded-until dates, earned vs in-hand clarity, and a plain intercept for predatory earned-wage advances.",
  openGraph: {
    title: "Runway",
    description:
      "How long until my money runs out — before a $150 advance feels like the only option.",
    type: "website",
  },
};

const themeBootScript = `(function(){try{var t=localStorage.getItem("runway-theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${dmSans.variable} antialiased`}>
        <ThemeProvider>
          <WorkerProvider>
            <div className="mx-auto min-h-dvh max-w-lg">
              <Header />
              <main className="page-enter px-4 pb-16 pt-6">{children}</main>
            </div>
          </WorkerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
