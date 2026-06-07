"use client";

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="px-6 py-3 bg-[#62C5D1] text-[#0b092e] font-semibold rounded-2xl hover:bg-white transition"
    >
      Copy Embed Code
    </button>
  );
}
