import type { Metadata } from "next";
import { Inter, Oswald, Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Providers } from "@/app/providers";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Garage Egypt — Premium Car Parts & Expert Services",
    template: "%s | Garage Egypt",
  },
  description:
    "Egypt's #1 automotive marketplace. Buy compatible spare parts, book trusted service centers, and shop from verified vendors. قطع غيار سيارات ومراكز خدمة موثوقة في مصر.",
  metadataBase: new URL("https://garage.eg"),
  keywords: [
    "spare parts Egypt",
    "قطع غيار",
    "car service Cairo",
    "مركز صيانة",
    "brake pads",
    "تغيير زيت",
    "automotive marketplace Egypt",
  ],
  openGraph: {
    siteName: "Garage Egypt",
    locale: "ar_EG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="ltr" className={cn("light", "font-sans", geist.variable)}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${oswald.variable} font-sans bg-[#f6f6f8] dark:bg-[#111621] text-slate-900 dark:text-slate-100 antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />

          {/* Emergency Roadside CTA */}
          <button className="fixed bottom-8 right-8 z-[100] bg-red-600 text-white flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl shadow-red-600/40 hover:scale-110 transition-transform group">
            <span className="material-symbols-outlined animate-pulse">sos</span>
            <span className="font-black text-sm uppercase tracking-tighter">
              Emergency Roadside
            </span>
          </button>
        </Providers>
      </body>
    </html>
  );
}
