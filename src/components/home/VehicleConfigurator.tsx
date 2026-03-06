"use client";

export default function VehicleConfigurator() {
  return (
    <section className="relative -mt-24 z-30 max-w-5xl mx-auto px-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[#FF4B19]">
            directions_car
          </span>
          <h3 className="text-xl font-bold">Configure Your Vehicle</h3>
          <p className="text-slate-400 text-sm ml-auto">
            Personalize your parts feed
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Brand
            </label>
            <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30">
              <option>Select Make</option>
              <option>BMW</option>
              <option>Mercedes-Benz</option>
              <option>Toyota</option>
              <option>Hyundai</option>
              <option>Kia</option>
              <option>Chevrolet</option>
              <option>Audi</option>
              <option>Porsche</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Model
            </label>
            <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30">
              <option>Select Model</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Year
            </label>
            <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30">
              <option>Select Year</option>
              {Array.from({ length: 30 }, (_, i) => 2024 - i).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="mt-8 w-full bg-[#FF4B19] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#FF4B19]/20 hover:bg-[#FF4B19]/90 transition-all uppercase tracking-widest text-sm">
          Save to My Garage
        </button>
      </div>
    </section>
  );
}
