import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatNumber } from '../../lib/utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { Switch } from '@headlessui/react';
import clsx from 'clsx';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { DEFAULT_BEE_AVATAR } from '../../lib/constants';

interface LeaderboardEntry {
  user_id: string;
  bee_name: string;
  avatar_url: string | null;
  current_period_pollen: number;
  total_pollen: number;
  current_period_rank: number;
  all_time_rank: number;
}

interface UserPollen {
  current_period_pollen: number;
  total_pollen: number;
  current_rank: number;
  all_time_rank: number;
}

const POLLEN_ICON_URL = 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets//pollen.png';

export const PollenLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCurrentPeriod, setShowCurrentPeriod] = useState(true);
  const [nextDropTime, setNextDropTime] = useState<Date | null>(null);

  // Calculate next Thursday 10am
  useEffect(() => {
    const getNextThursday = () => {
      const now = new Date();
      const nextThursday = new Date();
      nextThursday.setDate(now.getDate() + ((4 + 7 - now.getDay()) % 7));
      nextThursday.setHours(10, 0, 0, 0);
      if (nextThursday <= now) {
        nextThursday.setDate(nextThursday.getDate() + 7);
      }
      return nextThursday;
    };

    setNextDropTime(getNextThursday());
    const timer = setInterval(() => setNextDropTime(getNextThursday()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeRemaining = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', showCurrentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pollen_leaderboard')
        .select('*')
        .order(showCurrentPeriod ? 'current_period_pollen' : 'total_pollen', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: userStats, isLoading: isUserStatsLoading } = useQuery<LeaderboardEntry>({
    queryKey: ['userStats', showCurrentPeriod],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('pollen_leaderboard')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data;
    }
  });

  const filteredLeaderboard = leaderboardData
    ? leaderboardData.filter(entry => 
        entry.bee_name?.toLowerCase().includes(searchQuery.toLowerCase() || '')
      )
    : [];

  if (isLeaderboardLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto relative pt-16">
      <div className="flex mb-16">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent mx-auto">
          Leaderboard
        </h1>
        {userStats && (
          <div className="absolute right-[-100px] flex items-center bg-light/10 rounded-full px-4 py-2">
            <img 
              src={userStats.avatar_url || DEFAULT_BEE_AVATAR} 
              alt="User" 
              className="w-8 h-8 rounded-full mr-2"
            />
            <img 
              src={POLLEN_ICON_URL} 
              alt="PLN" 
              className="w-6 h-6 mr-1" 
            />
            <span className="text-light mr-2">
              {formatNumber(showCurrentPeriod ? userStats.current_period_pollen : userStats.total_pollen)}
            </span>
            <span className="text-light/50">
              #{showCurrentPeriod ? userStats.current_period_rank : userStats.all_time_rank}
            </span>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-end mb-4">
          <div className="bg-light/10 rounded-full p-1 flex text-sm">
            <button
              onClick={() => setShowCurrentPeriod(true)}
              className={clsx(
                'px-4 py-1.5 rounded-full font-medium transition-colors',
                showCurrentPeriod
                  ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-dark'
                  : 'text-light'
              )}
            >
              Current Prize
            </button>
            <button
              onClick={() => setShowCurrentPeriod(false)}
              className={clsx(
                'px-4 py-1.5 rounded-full font-medium transition-colors',
                !showCurrentPeriod
                  ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-dark'
                  : 'text-light'
              )}
            >
              All Time
            </button>
          </div>

          <div className="text-right">
            <div className="text-light text-lg mb-2 text-center">Next Pollen Drop</div>
            <div className="text-5xl font-mono text-light font-bold">{formatTimeRemaining(nextDropTime)}</div>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Bee Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-light/5 border border-light/10 rounded-full py-3 pl-12 pr-4 text-light placeholder-light/30 focus:outline-none focus:border-light/20"
            />
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-light/30" />
          </div>
        </div>

        <div className="bg-light/5 rounded-3xl overflow-hidden">
          {filteredLeaderboard.map((entry, index) => (
            <div
              key={entry.user_id}
              className={clsx(
                'flex items-center px-6 py-4',
                index % 2 === 1 && 'bg-light/5'
              )}
            >
              <div className="w-12 text-xl font-medium text-light">#{index + 1}</div>
              <img
                src={entry.avatar_url || DEFAULT_BEE_AVATAR}
                alt={entry.bee_name}
                className="w-12 h-12 rounded-full mr-4"
              />
              <div className="flex-1 text-xl text-light">{entry.bee_name}</div>
              <div className="flex items-center">
                <img src={POLLEN_ICON_URL} alt="PLN" className="w-8 h-8 mr-2" />
                <span className="text-xl text-light">
                  {formatNumber(showCurrentPeriod ? entry.current_period_pollen : entry.total_pollen)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 