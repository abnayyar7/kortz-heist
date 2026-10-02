"use client";

import { useState } from "react";
import items from "../data/items.json";

const FLOOR_OPTIONS = ["Basement", "Ground Floor", "First Floor", "Second Floor"];
const FLOOR_BADGE_CLASSES = {
  Basement: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  "Ground Floor": "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  "First Floor": "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  "Second Floor": "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export default function Home() {
  const [inventory, setInventory] = useState(() =>
    items.map((item) => ({
      ...item,
      isAvailable: false,
      isSecondary: false,
      floor: "Basement",
    })),
  );
  const [primaryTarget, setPrimaryTarget] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState(1);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = inventory
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      [item.Target, item.Type].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );

  function updateItem(index, updates) {
    setInventory((currentInventory) =>
      currentInventory.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    );
  }

  async function handleCheckout() {
    const selectedItems = inventory.filter((item) => item.isAvailable);

    setIsCalculating(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players, selectedItems, primaryTarget }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Optimization failed (${response.status}).`);
      }

      setResults(data);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "An unexpected error occurred while optimizing the loot.",
      );
    } finally {
      setIsCalculating(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-400">
            Kortz Heist / Planning
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Loot optimizer</h1>
        </header>

        <section aria-label="Loot inventory" className="flex flex-col gap-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <label className="flex flex-col gap-3 text-base font-semibold">
              🎯 Primary Target
              <input
                className="h-12 rounded-md border border-emerald-300 bg-white px-4 text-lg text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/20 dark:border-emerald-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                type="text"
                value={primaryTarget}
                onChange={(event) => setPrimaryTarget(event.target.value)}
                placeholder="Enter this week's primary target..."
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Search inventory
              <input
                className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Type or target"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Players
              <input
                className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                type="number"
                min="1"
                max="4"
                step="1"
                value={players}
                onChange={(event) => {
                  const nextPlayers = Number(event.target.value);
                  if (Number.isInteger(nextPlayers) && nextPlayers >= 1 && nextPlayers <= 4) {
                    setPlayers(nextPlayers);
                  }
                }}
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-zinc-100 text-xs uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <tr>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Target</th>
                  <th className="px-5 py-4 text-center font-semibold">Available</th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Mandatory (Secondary)
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">Floor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredItems.map(({ item, index }) => (
                  <tr
                    className="odd:bg-white even:bg-zinc-50 hover:bg-emerald-50/70 dark:odd:bg-zinc-900 dark:even:bg-zinc-950 dark:hover:bg-emerald-950/40"
                    key={`${item.Target}-${index}`}
                  >
                    <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">{item.Type}</td>
                    <td className="px-5 py-4 font-medium">{item.Target}</td>
                    <td className="px-5 py-4 text-center">
                      <input
                        aria-label={`Mark ${item.Target} as available`}
                        className="size-5 cursor-pointer accent-emerald-700 disabled:cursor-not-allowed"
                        type="checkbox"
                        checked={item.isAvailable}
                        disabled={item.isSecondary}
                        onChange={(event) =>
                          updateItem(index, { isAvailable: event.target.checked })
                        }
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <input
                        aria-label={`Mark ${item.Target} as mandatory`}
                        className="size-5 cursor-pointer accent-emerald-700"
                        type="checkbox"
                        checked={item.isSecondary}
                        onChange={(event) => {
                          const isSecondary = event.target.checked;
                          updateItem(index, {
                            isSecondary,
                            isAvailable: isSecondary || item.isAvailable,
                          });
                        }}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <select
                        aria-label={`Set floor for ${item.Target}`}
                        className="h-10 w-full min-w-36 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        value={item.floor}
                        onChange={(event) => updateItem(index, { floor: event.target.value })}
                      >
                        {FLOOR_OPTIONS.map((floor) => (
                          <option key={floor} value={floor}>
                            {floor}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400"
                      colSpan="5"
                    >
                      No items match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col items-start gap-5 border-t border-zinc-200 pt-6 dark:border-zinc-800" aria-label="Optimization results">
          <button
            className="min-h-12 w-full rounded-md bg-emerald-800 px-8 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 disabled:cursor-wait disabled:opacity-50 sm:w-auto"
            type="button"
            onClick={handleCheckout}
            disabled={isCalculating}
          >
            {isCalculating ? "Calculating..." : "Checkout"}
          </button>

          {error && (
            <div
              className="w-full rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          {results && (
            <div className="flex w-full flex-col gap-5" aria-live="polite">
              <div className="border-l-4 border-emerald-700 bg-emerald-50 px-5 py-4 dark:bg-emerald-950/40">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  Grand Total Profit
                </p>
                <p className="mt-1 text-3xl font-bold text-emerald-950 dark:text-emerald-100">
                  $
                  {results
                    .reduce((total, player) => total + player.totalProfit, 0)
                    .toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
              </div>

              {primaryTarget && (
                <div className="rounded-lg border border-blue-300 bg-blue-50 px-5 py-4 dark:border-blue-900 dark:bg-blue-950/40">
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                    🎯 Primary Target: <span className="font-bold text-blue-950 dark:text-blue-100">{primaryTarget}</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {results.map((player, playerIndex) => {
                  const bagWeight = player.items.reduce(
                    (total, item) => total + item.Weight,
                    0,
                  );

                  return (
                    <article
                      className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                      key={`player-${playerIndex}`}
                    >
                      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                        <div>
                          <h2 className="text-lg font-bold">Player {playerIndex + 1}</h2>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Bag Weight: {bagWeight}/100
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-lg font-bold text-emerald-800 dark:text-emerald-400">
                          $
                          {player.totalProfit.toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      {player.items.length > 0 ? (
                        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {player.items.map((item, itemIndex) => (
                            <li
                              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                              key={`${item.Target}-${itemIndex}`}
                            >
                              <div>
                                <p className="text-sm font-medium">{item.Target}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {item.Type}
                                  </p>
                                  <span
                                    className={`rounded px-2 py-0.5 text-xs font-medium ${FLOOR_BADGE_CLASSES[item.floor]}`}
                                  >
                                    {item.floor}
                                  </span>
                                </div>
                              </div>
                              <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                                {item.Weight} wt
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          No loot assigned.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
