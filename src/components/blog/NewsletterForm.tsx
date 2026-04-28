"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  isAr: boolean;
}

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export default function NewsletterForm({ isAr }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("newsletter_subscribers")
      .insert({
        email: email.trim().toLowerCase(),
        locale: isAr ? "ar" : "en",
      });

    if (!error) {
      setStatus("success");
      setEmail("");
    } else if (error.code === "23505") {
      // unique violation — already subscribed
      setStatus("duplicate");
    } else {
      setStatus("error");
    }
  }

  const messages: Record<Status, { ar: string; en: string }> = {
    idle: { ar: "", en: "" },
    loading: { ar: "", en: "" },
    success: { ar: "✅ تم الاشتراك بنجاح!", en: "✅ Subscribed successfully!" },
    duplicate: {
      ar: "📬 أنت مشترك بالفعل.",
      en: "📬 You're already subscribed.",
    },
    error: {
      ar: "حدث خطأ، حاول مرة أخرى.",
      en: "Something went wrong. Please try again.",
    },
  };

  return (
    <div className="max-w-md mx-auto">
      <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setStatus("idle");
          }}
          placeholder={isAr ? "بريدك الإلكتروني" : "Your email address"}
          className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#f6f6f8] dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF4B19] text-sm"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-[#FF4B19] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#e04316] transition-colors text-sm whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading"
            ? isAr
              ? "جارٍ..."
              : "Sending..."
            : isAr
              ? "اشترك الآن"
              : "Subscribe"}
        </button>
      </form>
      {status !== "idle" && status !== "loading" && (
        <p
          className={`mt-3 text-sm text-center ${
            status === "success"
              ? "text-emerald-500"
              : status === "duplicate"
                ? "text-blue-500"
                : "text-red-500"
          }`}
        >
          {isAr ? messages[status].ar : messages[status].en}
        </p>
      )}
    </div>
  );
}
