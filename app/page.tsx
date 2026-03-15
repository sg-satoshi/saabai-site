export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      
      <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
        SAABAI.AI
      </h1>

      <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mb-10">
        Intelligent AI systems that give business owners their time back.
      </p>

      <div className="flex gap-4">
        <a
          href="#"
          className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          Book an AI Audit
        </a>

        <a
          href="#"
          className="border border-gray-600 px-6 py-3 rounded-lg hover:border-white transition"
        >
          Learn More
        </a>
      </div>

    </main>
  );
}