import { MOVIES } from "@/app/utils/movies";
import { Clapperboard } from "lucide-react";

export function AuthPanel() {
  const COLLAGE = MOVIES.slice(0, 6).map((m) => m.poster);
  return (
    <div className="hidden md:flex md:w-[52%] relative overflow-hidden flex-col justify-end px-12 pb-14 shrink-0">
      <div className="absolute inset-0 grid grid-cols-3 gap-0.5">
        {COLLAGE.map((src, i) => (
          <div key={i} className="overflow-hidden bg-[#0D0F14]">
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover opacity-40 scale-105"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-linear-to-t from-[#0D0F14] via-[#0D0F14]/75 to-[#0D0F14]/10" />
      <div className="absolute inset-0 bg-linear-to-t from-transparent to-[#0D0F14]/50" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-[#F5A623]/5 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#F5A623]/15 border border-[#F5A623]/25 flex items-center justify-center">
            <Clapperboard
              size={22}
              className="text-[#F5A623]"
              strokeWidth={1.5}
            />
          </div>
          <span className="font-black text-[#F0F0F0] text-2xl tracking-tight">
            CineMatch
          </span>
        </div>
        <p className="text-[#F0F0F0]/70 text-2xl font-light leading-snug mb-8">
          Descubra filmes que
          <br />
          <span className="text-[#F5A623]">combinam com você.</span>
        </p>
        <div className="flex flex-col gap-2">
          {MOVIES.slice(0, 3).map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 bg-white/6 backdrop-blur-sm border border-white/8 rounded-xl px-3 py-2 w-fit"
            >
              {/* <Star size={11} className="fill-[#E8C84A] text-[#E8C84A]" /> */}
              <span className="text-[#E8C84A] text-xs font-bold tabular-nums">
                {m.rating.toFixed(1)}
              </span>
              <span
                className="text-white/80 text-sm font-medium"
                //   style={syne()}
              >
                {m.title}
              </span>
              <span className="text-white/30 text-xs">{m.year}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
