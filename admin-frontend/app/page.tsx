import Link from "next/link"

export default function Home() {

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
      <h1 className="text-2xl font-bold mb-6">Welcome to Admin Panel</h1>
      <button>
        <Link
          href="/dashboard"

          className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition"
        >
          Go to Dashboard
        </Link>
      </button>
    </div>
  );
}