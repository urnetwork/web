import React, { useState, useEffect } from "react";
import { Trophy, RefreshCw, AlertCircle, Medal } from "lucide-react";
import { fetchLeaderboard, fetchNetworkRanking } from "../services/api";
import type { LeaderboardEntry, NetworkRanking } from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.05s' }}>
        <div>
          <h2 className="text-3xl font-bold text-ur-white flex items-center gap-3">
            <div className="p-2 bg-ur-yellow-light rounded-ur">
              <Trophy className="text-ur-black" size={28} />
            </div>
            Network Leaderboard
          </h2>
          <p className="text-ur-gray mt-2">
            Global network performance rankings and statistics
          </p>
          {lastUpdated && (
            <p className="text-sm text-ur-gray-dark mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        <button
          onClick={loadLeaderboard}
          disabled={isLoading}
          className="flex items-center gap-2 bg-ur-yellow-light hover:bg-ur-yellow-light/90 text-ur-black px-6 py-3 rounded-ur transition-colors duration-100 "
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh Leaderboard
        </button>
      </div>

      {error && (
        <div className="bg-ur-coral/15 border border-ur-coral p-4 rounded-ur flex items-start gap-3">
          <AlertCircle
            size={20}
            className="text-ur-coral mt-0.5 flex-shrink-0"
          />
          <div>
            <h3 className="font-medium text-ur-coral">
              Error loading leaderboard
            </h3>
            <p className="text-ur-coral">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-ur-border border-t-ur-yellow-light"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-ur-yellow-light/20 to-ur-green/20 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {ranking && (
            <div className="bg-ur-blue rounded-ur shadow-ur-flat p-6 text-ur-white border border-ur-blue animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-3 mb-4">
                <Medal size={24} />
                <h3 className="text-xl font-semibold">Your Network Ranking</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-ur-blue-light">Total Data Transfer</p>
                  <p className="text-2xl font-bold">
                    {formatMibCount(ranking.net_mib_count)}
                  </p>
                </div>
                <div>
                  <p className="text-ur-blue-light">Leaderboard Position</p>
                  <p className="text-2xl font-bold">
                    #{ranking.leaderboard_rank}
                  </p>
                </div>
                <div>
                  <p className="text-ur-blue-light">Network Status</p>
                  <p className="text-2xl font-bold">
                    {ranking.leaderboard_public ? "Public" : "Private"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.15s' }}>
            <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
              <h3 className="font-medium text-ur-white">Global Rankings</h3>
              <p className="text-sm text-ur-gray mt-1">
                Top performing networks worldwide
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ur-border">
                <thead className="bg-ur-black">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
                      Network
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
                      Data Transfer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-ur-panel divide-y divide-ur-border">
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.network_id}
                      className={`transition-colors ${
 ranking?.leaderboard_rank === index + 1
 ? "bg-ur-blue/15 border-l-4 border-ur-blue"
                          : "hover:bg-ur-raised/50"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ur-white">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <Trophy size={16} className="text-ur-yellow-light" />
                          )}
                          {index === 1 && (
                            <Medal size={16} className="text-ur-gray" />
                          )}
                          {index === 2 && (
                            <Medal size={16} className="text-ur-coral" />
                          )}
                          #{index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-gray">
                        {entry.network_name || "Private Network"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-white font-medium">
                        {formatMibCount(entry.net_mib_count)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
 entry.is_public
 ? "bg-ur-green/10 text-ur-green border border-ur-green"
                              : "bg-ur-raised text-ur-gray border border-ur-border"
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
                  <div className="w-16 h-16 bg-ur-raised rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="text-ur-gray-dark" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-ur-white mb-2">
                    No Leaderboard Data
                  </h3>
                  <p className="text-ur-gray italic">
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
