import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const OFFER_ITEMS = [
  { icon: "oil_barrel", title: "Synthetic Oil", desc: "From EGP 1,200" },
  { icon: "speed", title: "Brake Pads", desc: "Save 15% today" },
  { icon: "filter_alt", title: "Air Filters", desc: "Bundle & save" },
  { icon: "ac_unit", title: "AC Refill", desc: "Fixed EGP 800" },
];

export default function OffersSection() {
  return (
    <section className="py-8 md:py-24 max-w-7xl mx-auto px-4 md:px-6">
      <Card className="overflow-hidden bg-slate-900 border-0">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left — copy */}
            <div className="p-10 lg:p-14 flex flex-col justify-center">
              <Badge
                variant="outline"
                className="w-fit border-orange-500/40 text-orange-400 mb-5 uppercase tracking-widest text-[10px]"
              >
                Exclusive Offer
              </Badge>
              <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-white mb-3 md:mb-4 leading-tight">
                Seasonal Maintenance Package
              </h2>
              <p className="text-slate-400 text-xs md:text-base mb-6 md:mb-8 leading-relaxed">
                Get 30% off on full vehicle diagnostics and fluid change for all
                European models. Limited time — available until end of month.
              </p>
              <div className="flex items-center gap-8 mb-8">
                {[
                  { value: "12", label: "Days" },
                  { value: "24", label: "Hours" },
                  { value: "59", label: "Mins" },
                ].map((t, i) => (
                  <div key={t.label} className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-3xl font-black text-white">
                        {t.value}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
                        {t.label}
                      </p>
                    </div>
                    {i < 2 && (
                      <Separator
                        orientation="vertical"
                        className="h-8 bg-slate-700"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="font-bold"
                  asChild
                >
                  <Link href="/offers/seasonal-maintenance">
                    Claim Offer Now
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="font-bold text-slate-400 hover:text-white"
                  asChild
                >
                  <Link href="/offers">View All Deals →</Link>
                </Button>
              </div>
            </div>

            {/* Right — product grid */}
            <div className="grid grid-cols-2 border-l border-slate-800">
              {OFFER_ITEMS.map((item, i) => (
                <div
                  key={item.title}
                  className={`p-8 flex flex-col gap-3 border-slate-800 ${
                    i % 2 === 0 ? "border-r" : ""
                  } ${
                    i < 2 ? "border-b" : ""
                  } hover:bg-white/5 transition-colors cursor-pointer`}
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">
                      {item.icon}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-0.5">
                      {item.title}
                    </h5>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
