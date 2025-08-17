import React from "react";
import { ClockIcon, EyeSlashIcon, UsersIcon } from "@heroicons/react/24/outline";

/**
 * Full-page section highlighting common research pain points.
 * Responsive grid with cards that animate on hover.
 */
export default function PainPointsSection() {
  const cards = [
    {
      title: "Time Wasted",
      description:
        "Switching between 8+ different tools for literature review, writing, and collaboration.",
      Icon: ClockIcon,
    },
    {
      title: "Lost Focus",
      description:
        "Constant context switching breaks deep work and reduces research quality.",
      Icon: EyeSlashIcon,
    },
    {
      title: "Team Chaos",
      description:
        "Fragmented communication and version control nightmares slow collaboration.",
      Icon: UsersIcon,
    },
  ];

  return (
    <section className="min-h-screen w-full flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-950 px-4 md:px-8">
      <div className="max-w-4xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Research Shouldn't Be This Hard
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-12 md:text-lg">
          Academic researchers waste 40% of their time on administrative tasks and tool-switching
          instead of actual research.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-6 w-full max-w-6xl md:grid-cols-3 mb-12">
        {cards.map(({ title, description, Icon }) => (
          <div
            key={title}
            className="group relative rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-start transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-400"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 mb-6 transition-colors duration-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50">
              <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </div>

      <button className="inline-flex items-center space-x-2 bg-black text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus:ring-blue-800">
        <span>Solve This Now</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 6.75L21 12m0 0l-3.75 5.25M21 12H3"
          />
        </svg>
      </button>
    </section>
  );
}
