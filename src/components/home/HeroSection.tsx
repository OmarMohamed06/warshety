import Link from "next/link";

export default function HeroSection() {
  return (
    <section
      className="w-full bg-white dark:bg-slate-900 pb-4"
      style={{ fontFamily: 'var(--font-inter, "Inter"), sans-serif' }}
    >
      {/* Big bold title */}
      <div className="px-4 pt-8 pb-2 text-center overflow-hidden">
        <h1 className="text-[clamp(1.4rem,1vw,2rem)] font-black leading-none tracking-tighter text-slate-900 dark:text-white uppercase">
          Everything Your Car <span className="text-[#FF4B19]">Needs.</span>
        </h1>
      </div>

      {/* Car image with overlaid action chips */}
      <div className="relative overflow-hidden">
        <img
          src="/herocar.png"
          alt="Egypt Car Marketplace"
          className="w-full h-auto object-contain"
        />

        {/* Action chips
        <div className="absolute bottom-[130px] left-8 flex flex-wrap gap-2">
          <Link
            href="/parts"
            className="flex items-center gap-1.5 bg-black backdrop-blur-sm text-white text-xs font-bold px-4 py-2.5 rounded-full border border-white/10 hover:bg-[#FF4B19] transition-all"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            Find My Parts
          </Link>
          <Link
            href="/services"
            className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm text-black text-xs font-bold px-4 py-2.5 rounded-full border border-white/10 hover:bg-[#FF4B19] transition-all"
          >
            <span className="material-symbols-outlined text-sm">
              home_repair_service
            </span>
            Book a Service
          </Link>
          <Link
            href="/services/all"
            className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm text-black text-xs font-bold px-4 py-2.5 rounded-full border border-white/10 hover:bg-[#FF4B19] transition-all"
          >
            <span className="material-symbols-outlined text-sm">explore</span>
            Service Centers
          </Link>
          <Link
            href="/garage"
            className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm text-black text-xs font-bold px-4 py-2.5 rounded-full border border-white/10 hover:bg-[#FF4B19] transition-all"
          >
            <span className="material-symbols-outlined text-sm">garage</span>
            My Garage
          </Link>
        </div> */}
      </div>
    </section>
  );
}
