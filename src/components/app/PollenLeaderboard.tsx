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

const POLLEN_ICON_URL = 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/pollen.png';
const HONEY_ICON_URL = 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/Honey%20gradient.png';
const CROWN_URLS = {
  GOLD: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/GOLDEN%20CROWN.png',
  SILVER: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/SILVER%20CROWN.png',
  BRONZE: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/BRONZE%20CROWN.png'
};

export const PollenLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCurrentPeriod, setShowCurrentPeriod] = useState(true);
  const [nextDropTime, setNextDropTime] = useState<Date | null>(null);
  const [nextMonthTime, setNextMonthTime] = useState<Date | null>(null);
  const [honeyPrice, setHoneyPrice] = useState<number>(0);

  // Fetch HONEY price
  useEffect(() => {
    const fetchHoneyPrice = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('price_per_token')
        .eq('symbol', 'HONEY')
        .single();
      
      if (!error && data) {
        setHoneyPrice(data.price_per_token);
      }
    };

    fetchHoneyPrice();
  }, []);

  // Calculate next first day of the month
  useEffect(() => {
    const getNextMonth = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth;
    };

    const timer = setInterval(() => {
      const nextMonth = getNextMonth();
      setNextMonthTime(nextMonth);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatMonthEndTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return '0d 0h';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h`;
  };

  // Calculate next Thursday at 10 AM
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

    const timer = setInterval(() => {
      const nextThursday = getNextThursday();
      const now = new Date();
      if (nextThursday > now) {
        setNextDropTime(nextThursday);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimeRemaining = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return '00:00:00';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', showCurrentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pollen_leaderboard')
        .select('*')
        .order(showCurrentPeriod ? 'current_period_pollen' : 'total_pollen', { ascending: false });
      
      if (error) throw error;
      
      // Log the first few entries to check avatar URLs
      console.log('Leaderboard data (first 3 entries):', data?.slice(0, 3));
      
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

  const renderPodium = () => {
    if (!leaderboardData || leaderboardData.length < 3) return null;

    const [first, second, third] = leaderboardData;

    return (
      <div className="relative mb-16 pt-8">
        {/* Green gradient border box */}
        <div 
          className="absolute inset-0 rounded-[32px]"
          style={{
            background: 'linear-gradient(90deg, #00D54B 0%, #00D897 100%)',
            padding: '4px',
            opacity: '1'
          }}
        />
        <div className="absolute inset-[4px] rounded-[28px] bg-dark" />
        
        <div className="relative flex justify-between p-8">
          {/* Current Prize Section */}
          <div>
            <h3 className="text-xl font-bold text-light mb-3">Current Prize</h3>
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-light font-bold">1</span>
                <img src={HONEY_ICON_URL} alt="HONEY" className="w-6 h-6" />
                <span className="text-light">HONEY</span>
                <span className="text-light/60">(${honeyPrice.toLocaleString()})</span>
              </div>
              <div className="flex items-center">
                <span className="text-light font-bold">2500</span>
                <img src={POLLEN_ICON_URL} alt="PLN" className="w-6 h-6 mx-1" />
                <span className="text-light/50">PLN</span>
              </div>
            </div>
            <div className="text-light/60">
              Ends in {formatMonthEndTime(nextMonthTime)}
            </div>
          </div>

          {/* Podium Section */}
          <div className="flex items-end gap-4 relative" style={{ height: '180px' }}>
            {/* Second Place */}
            <div className="flex flex-col items-center">
              <img src={CROWN_URLS.SILVER} alt="Silver Crown" className="w-6 h-6 mb-1" />
              <div className="w-12 h-12 rounded-full overflow-hidden mb-1">
                <img src={second.avatar_url || DEFAULT_BEE_AVATAR} alt={second.bee_name} className="w-full h-full object-cover" />
              </div>
              <span className="text-light text-xs mb-1 truncate max-w-[80px] text-center">{second.bee_name}</span>
              <div className="w-20 h-[100px] bg-gradient-to-b from-[#FFD700] to-[#FFA500] rounded-t-lg flex items-start justify-center pt-1">
                <span className="text-dark text-lg font-bold">2</span>
              </div>
            </div>

            {/* First Place */}
            <div className="flex flex-col items-center">
              <img src={CROWN_URLS.GOLD} alt="Gold Crown" className="w-8 h-8 mb-1" />
              <div className="w-12 h-12 rounded-full overflow-hidden mb-1">
                <img src={first.avatar_url || DEFAULT_BEE_AVATAR} alt={first.bee_name} className="w-full h-full object-cover" />
              </div>
              <span className="text-light text-xs mb-1 truncate max-w-[80px] text-center">{first.bee_name}</span>
              <div className="w-20 h-[120px] bg-gradient-to-b from-[#FFD700] to-[#FFA500] rounded-t-lg flex items-start justify-center pt-1">
                <span className="text-dark text-lg font-bold">1</span>
              </div>
            </div>

            {/* Third Place */}
            <div className="flex flex-col items-center">
              <img src={CROWN_URLS.BRONZE} alt="Bronze Crown" className="w-6 h-6 mb-1" />
              <div className="w-12 h-12 rounded-full overflow-hidden mb-1">
                <img src={third.avatar_url || DEFAULT_BEE_AVATAR} alt={third.bee_name} className="w-full h-full object-cover" />
              </div>
              <span className="text-light text-xs mb-1 truncate max-w-[80px] text-center">{third.bee_name}</span>
              <div className="w-20 h-[80px] bg-gradient-to-b from-[#FFD700] to-[#FFA500] rounded-t-lg flex items-start justify-center pt-1">
                <span className="text-dark text-lg font-bold">3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLeaderboardLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto relative pt-16">
      <h1 className="text-6xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent text-center mb-16">
        Leaderboard
      </h1>

      <div className="max-w-2xl mx-auto">
        {renderPodium()}

        {/* Position the countdown timer absolutely */}
        <div className="relative">
          {/* Next Pollen Drop countdown positioned absolutely */}
          <div className="absolute right-0 -bottom-2 z-10">
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 justify-center w-full">
                <img src={POLLEN_ICON_URL} alt="PLN" className="w-6 h-6" />
                <span className="text-light">Next Pollen Drop</span>
              </div>
              <div className="font-mono text-[56px] font-bold text-light leading-none">
                {formatTimeRemaining(nextDropTime)}
              </div>
            </div>
          </div>

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
                  <span className="text-light/50 ml-1">PLN</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {userStats && (
        <div className="absolute right-[-100px] top-16 flex items-center bg-light/10 rounded-full px-4 py-2">
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
            <span className="text-light/50 ml-1">PLN</span>
          </span>
          <span className="text-light/50">
            #{showCurrentPeriod ? userStats.current_period_rank : userStats.all_time_rank}
          </span>
        </div>
      )}
    </div>
  );
}; 