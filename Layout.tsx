import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Toaster } from "@/components/ui/toaster";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-white flex flex-col">
      {/* Premium background with multiple layers */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        {/* Primary glow - top center */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[600px] h-[400px] bg-primary/15 rounded-full blur-[120px] opacity-60"></div>
        
        {/* Secondary ambient glow - bottom left */}
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-40"></div>
        
        {/* Tertiary ambient glow - right */}
        <div className="absolute top-1/3 -right-20 w-[300px] h-[500px] bg-primary/8 rounded-full blur-[120px] opacity-30"></div>
        
        {/* Noise texture overlay for depth */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]"></div>
      </div>
      
      <Navbar />
      <main className="flex-1 container py-8 md:py-12 px-4 mx-auto animate-fade-in">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
