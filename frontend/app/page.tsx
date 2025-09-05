import type React from "react"
import { Bell, Clock, Earth } from "lucide-react"
import { Globe } from "@/components/magicui/globe";
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="px-6 py-16 md:py-24 relative">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div className="space-y-8 lg:pr-8">
              <h1 className="text-balance text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                Monitor Your Website with{" "}
                <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                  Confidence
                </span>
              </h1>
              <p className="text-pretty text-xl text-gray-400 leading-relaxed max-w-prose">
                Decentralized, community-validated uptime from around the globe. Be the first to know—wherever your
                users are.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button>
                  <Link
                    href="/login"

                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-500/25 inline-block text-center"
                  >
                    Start Free Trial
                  </Link>
                </button>
                <button>
                  <a
                    target="_blank"
                    href="https://petal-chive-450.notion.site/Become-a-Validator-and-Earn-Rewards-with-Web-Uptime-Monitor-2640dfaf8c7e80c8b609c04b2c23fb68"
                    className="px-6 py-3 border-2 border-orange-600 text-white hover:bg-orange-600 hover:text-white rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-500/25 inline-block text-center"
                  >
                    Start Earning In Crypto
                  </a>
                </button>
              </div>
            </div>

            {/* Globe positioned to the upper right on desktop, below heading on mobile */}
            <div className="hidden relative lg:flex items-start justify-center lg:justify-end order-first lg:order-last">
              <div className="w-full max-w-[400px] lg:max-w-[500px]">
                <Globe className="w-full " />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 bg-gray-900/30">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="group cursor-pointer">
              <div className="text-3xl md:text-4xl font-bold text-orange-500 mb-2 group-hover:scale-110 transition-transform">99.99%</div>
              <div className="text-gray-400">Uptime Guarantee</div>
            </div>
            <div className="group cursor-pointer">
              <div className="text-3xl md:text-4xl font-bold text-orange-500 mb-2 group-hover:scale-110 transition-transform">&lt;30s</div>
              <div className="text-gray-400">Alert Response</div>
            </div>
            <div className="group cursor-pointer">
              <div className="text-3xl md:text-4xl font-bold text-orange-500 mb-2 group-hover:scale-110 transition-transform">50K+</div>
              <div className="text-gray-400">Websites Monitored</div>
            </div>
            <div className="group cursor-pointer">
              <div className="text-3xl md:text-4xl font-bold text-orange-500 mb-2 group-hover:scale-110 transition-transform">24/7</div>
              <div className="text-gray-400">Global Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Everything you need for reliable monitoring
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Comprehensive monitoring tools designed to keep your business running smoothly
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Clock className="h-5 w-5 text-orange-500" aria-hidden="true" />}
              title="24/7 Monitoring"
              desc="Continuous checks from multiple regions to ensure consistent availability."
            />
            <Feature
              icon={<Bell className="h-5 w-5 text-orange-500" aria-hidden="true" />}
              title="Instant Alerts"
              desc="Get notified the moment something changes—no delays, no surprises."
            />
            <Feature
              icon={<Earth className="h-5 w-5 text-orange-500" aria-hidden="true" />}
              title="Decentralized tracking"
              desc="Signals validated by a global community—everywhere in the world."
            />
          </div>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="px-6 py-8 border-t border-gray-800">
        <div className="mx-auto max-w-6xl text-center text-sm text-gray-400">
          <p>
            made by <span className="text-white">Devang Rakholiya</span> •{" "}
            <a
              href="https://github.com/Devang0907"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline underline-offset-4"
              aria-label="GitHub profile"
            >
              GitHub
            </a>{" "}
            •{" "}
            <a
              href="https://x.com/Devang0907"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline underline-offset-4"
              aria-label="X (Twitter) profile"
            >
              X
            </a>
          </p>
        </div>
      </footer>
    </main>
  )
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black/40 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  )
}
