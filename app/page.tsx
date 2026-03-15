export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6">

      <section className="text-center max-w-4xl">

        <h1 className="text-6xl font-bold mb-6 tracking-tight">
          SAABAI.AI
        </h1>

        <p className="text-xl text-gray-300 mb-10">
          Intelligent AI systems that remove operational chaos,
          automate repetitive work, and give business owners
          their time back.
        </p>

        <div className="flex gap-4 justify-center mb-20">
          <button className="bg-white text-black px-6 py-3 rounded-lg font-medium">
            Book an AI Audit
          </button>

          <button className="border border-gray-600 px-6 py-3 rounded-lg">
            See How It Works
          </button>
        </div>

      </section>

      <section className="max-w-5xl text-center">

        <h2 className="text-3xl font-semibold mb-6">
          What We Do
        </h2>

        <p className="text-gray-400 mb-12">
          Saabai builds intelligent automation systems that eliminate
          manual tasks, increase response speed, and allow companies
          to scale without increasing headcount.
        </p>

        <div className="grid md:grid-cols-3 gap-10 text-left">

          <div>
            <h3 className="text-xl font-semibold mb-2">
              AI Audits
            </h3>
            <p className="text-gray-400">
              We analyse your business operations and identify
              the highest ROI automation opportunities.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">
              AI Agents
            </h3>
            <p className="text-gray-400">
              Voice agents, support agents, and internal
              automation that works 24/7.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">
              Workflow Automation
            </h3>
            <p className="text-gray-400">
              Connect your CRM, email, calendars, and internal
              systems into one intelligent workflow engine.
            </p>
          </div>

        </div>

      </section>

    </main>
  );
}