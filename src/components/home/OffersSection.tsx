export default function OffersSection() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-6 overflow-hidden">
      <div className="bg-slate-900 rounded-3xl p-12 relative">
        {/* Decorative icon */}
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <span className="material-symbols-outlined text-[200px]">
            auto_awesome
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          {/* Left copy */}
          <div>
            <span className="text-[#FF4B19] font-black uppercase tracking-widest text-sm mb-4 block">
              Exclusive Offers
            </span>
            <h2 className="text-4xl font-black text-white mb-6">
              Seasonal Maintenance Package
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Get 30% off on full vehicle diagnostics and fluid change for all
              European models. Limited time offer available until end of month.
            </p>

            <div className="flex items-center gap-8 mb-10 text-white">
              <div>
                <span className="block text-3xl font-black">12</span>
                <span className="text-xs uppercase text-slate-500 font-bold">
                  Days Left
                </span>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div>
                <span className="block text-3xl font-black">24</span>
                <span className="text-xs uppercase text-slate-500 font-bold">
                  Hours Left
                </span>
              </div>
            </div>

            <button className="bg-white text-slate-900 px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all">
              Claim Offer Now
            </button>
          </div>

          {/* Right product cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: "oil_barrel",
                title: "Synthetic Oil",
                desc: "Starting from 1,200 EGP",
                offset: false,
              },
              {
                icon: "speed",
                title: "Brake Pads",
                desc: "Save 15% Today",
                offset: true,
              },
              {
                icon: "filter_alt",
                title: "Air Filters",
                desc: "Bundle & Save",
                offset: false,
              },
              {
                icon: "ac_unit",
                title: "AC Refill",
                desc: "Fixed Price 800 EGP",
                offset: true,
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`bg-slate-800/50 backdrop-blur p-6 rounded-2xl border border-white/5${item.offset ? " mt-8" : ""}`}
              >
                <span className="material-symbols-outlined text-[#FF4B19] mb-3 block">
                  {item.icon}
                </span>
                <h5 className="text-white font-bold mb-1">{item.title}</h5>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
