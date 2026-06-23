import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ineedtools.in"),
  title: {
    default: "iNeedTools - Free Online Tools, SQL Generators & Developer Utilities",
    template: "%s | iNeedTools",
  },
  description:
    "Need tools online? iNeedTools offers free SQL generators, JSON validators, QR code generators, Base64 converters, image converters, PDF tools, UUID generators, hash generators, regex testers, age calculators and many more. Zero sign-up, runs entirely in your browser.",
  keywords: [
    "free online developer tools", "sql generator", "json validator", "json formatter",
    "qr code generator", "base64 encoder decoder", "uuid generator", "hash generator",
    "sha256 generator", "regex tester", "age calculator", "image converter",
    "jpg to png", "png to webp", "image format converter", "pdf tools",
    "word to pdf", "pdf to word", "color picker", "hex to rgb", "csv to json",
    "markdown preview", "jwt decoder", "timestamp converter", "text tools",
    "ineedtools", "browser tools", "no signup tools",
  ],
  authors: [{ name: "iNeedTools", url: "https://ineedtools.in" }],
  creator: "iNeedTools",
  publisher: "iNeedTools",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  alternates: {
    canonical: "https://ineedtools.in",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ineedtools.in",
    siteName: "iNeedTools",
    title: "iNeedTools - Free Online Tools, SQL Generators & Developer Utilities",
    description:
      "Need tools online? iNeedTools offers free SQL generators, JSON validators, QR code generators, Base64 converters, PDF tools and many more. Zero sign-up.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "iNeedTools — Need a Tool? We Have It." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "iNeedTools - Free Online Tools, SQL Generators & Developer Utilities",
    description:
      "Need tools online? iNeedTools offers free SQL generators, JSON validators, QR code generators, Base64 converters, PDF tools and many more. Zero sign-up.",
    images: ["/twitter-image"],
    creator: "@ineedtools",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
