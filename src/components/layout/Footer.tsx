import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[#111621] border-t border-slate-200 dark:border-slate-800 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-[#FF4B19] text-white p-1.5 rounded-lg">
                <span className="material-symbols-outlined text-2xl">
                  garage
                </span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
                Garage
              </span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Egypt&apos;s leading platform for premium automotive parts and
              expert vehicle services. Dedicated to quality and authenticity.
            </p>
          </div>

          {/* Shop & Service */}
          <div>
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white uppercase text-xs tracking-widest">
              Shop &amp; Service
            </h5>
            <ul className="space-y-4 text-sm text-slate-500">
              <li>
                <Link
                  href="/parts"
                  className="hover:text-[#FF4B19] transition-colors"
                >
                  Find Spare Parts
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="hover:text-[#FF4B19] transition-colors"
                >
                  Book a Mechanic
                </Link>
              </li>
              <li>
                <Link
                  href="/parts/brakes"
                  className="hover:text-[#FF4B19] transition-colors"
                >
                  Brake Services
                </Link>
              </li>
              <li>
                <Link
                  href="/services?q=engine-diagnosis"
                  className="hover:text-[#FF4B19] transition-colors"
                >
                  Engine Diagnosis
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white uppercase text-xs tracking-widest">
              Company
            </h5>
            <ul className="space-y-4 text-sm text-slate-500">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF4B19] transition-colors"
                >
                  About Garage
                </Link>
              </li>
              <li>
                <Link
                  href="/vendor/apply"
                  className="hover:text-[#FF4B19] transition-colors"
                >
                  Partner With Us
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF4B19] transition-colors"
                >
                  Customer Support
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF4B19] transition-colors"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white uppercase text-xs tracking-widest">
              Newsletter
            </h5>
            <p className="text-sm text-slate-500 mb-4">
              Get the latest parts arrivals and deals.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-sm focus:outline-none"
                placeholder="Email address"
                type="email"
              />
              <button className="bg-[#FF4B19] text-white p-2 rounded-lg hover:opacity-90 transition-all">
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-medium text-slate-400">
          <p>© 2024 Garage Marketplace Egypt. All rights reserved.</p>
          <div className="flex gap-8">
            <Link
              href="#"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
