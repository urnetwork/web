import React, { useState, useEffect } from "react";
import { Trophy, RefreshCw, AlertCircle, Medal } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchLeaderboard, fetchNetworkRanking } from "../services/api";
import type { LeaderboardEntry, NetworkRanking } from "../services/api";
import toast from "react-hot-toast";

const LeaderboardSection: React.FC = () => {
  const { token } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [ranking, setRanking] = useState<
    NetworkRanking["network_ranking"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadLeaderboard = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const [leaderboardResponse, rankingResponse] = await Promise.all([
        fetchLeaderboard(token),
        fetchNetworkRanking(token),
      ]);

      if (leaderboardResponse.error) {
        throw new Error(leaderboardResponse.error.message);
      }

      if (rankingResponse.error) {
        throw new Error(rankingResponse.error.message);
      }

      setLeaderboard(
        leaderboardResponse.earners?.map((e) =>
          e.network_id
            ? e
            : {
                ...e,
                network_id: Math.floor(Math.random() * 1000000).toString(),
              }
        )
      );
      setRanking(rankingResponse.network_ranking);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load leaderboard";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatMibCount = (mibCount: number) => {
    if (mibCount >= 1024) {
      return `${(mibCount / 1024).toFixed(2)} GB`;
    }
    return `${mibCount.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl">
              <Trophy className="text-white" size={28} />
            </div>
            Network Leaderboard
          </h2>
          <p className="text-gray-400 mt-2">
            Global network performance rankings and statistics
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        <button
          onClick={loadLeaderboard}
          disabled={isLoading}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg transition-all duration-200 border border-yellow-500 hover:shadow-lg"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh Leaderboard
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle
            size={20}
            className="text-red-400 mt-0.5 flex-shrink-0"
          />
          <div>
            <h3 className="font-medium text-red-300">
              Error loading leaderboard
            </h3>
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-yellow-500"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {ranking && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-2xl p-6 text-white border border-blue-500">
              <div className="flex items-center gap-3 mb-4">
                <Medal size={24} />
                <h3 className="text-xl font-semibold">Your Network Ranking</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-blue-100">Total Data Transfer</p>
                  <p className="text-2xl font-bold">
                    {formatMibCount(ranking.net_mib_count)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-100">Leaderboard Position</p>
                  <p className="text-2xl font-bold">
                    #{ranking.leaderboard_rank}
                  </p>
                </div>
                <div>
                  <p className="text-blue-100">Network Status</p>
                  <p className="text-2xl font-bold">
                    {ranking.leaderboard_public ? "Public" : "Private"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 border-b border-gray-600">
              <h3 className="font-medium text-gray-100">Global Rankings</h3>
              <p className="text-sm text-gray-400 mt-1">
                Top performing networks worldwide
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Network
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Data Transfer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.network_id}
                      className={`transition-colors ${
                        ranking?.leaderboard_rank === index + 1
                          ? "bg-blue-900/30 border-l-4 border-blue-500"
                          : "hover:bg-gray-700/50"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <Trophy size={16} className="text-yellow-400" />
                          )}
                          {index === 1 && (
                            <Medal size={16} className="text-gray-400" />
                          )}
                          {index === 2 && (
                            <Medal size={16} className="text-orange-400" />
                          )}
                          #{index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {entry.network_name || "Private Network"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">
                        {formatMibCount(entry.net_mib_count)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.is_public
                              ? "bg-green-900 text-green-300 border border-green-700"
                              : "bg-gray-700 text-gray-300 border border-gray-600"
                          }`}
                        >
                          {entry.is_public ? "Public" : "Private"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {leaderboard.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="text-gray-500" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-200 mb-2">
                    No Leaderboard Data
                  </h3>
                  <p className="text-gray-400 italic">
                    No ranking data available. Try refreshing the leaderboard.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardSection;
