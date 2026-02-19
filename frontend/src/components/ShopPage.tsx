import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  X,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  Crown,
  Sparkles,
  Shield,
  Smartphone,
  CreditCard
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import DarkVeil from '../../@/components/DarkVeil';

// --- Types ---
interface SubscriptionStats {
  subscription_type: string;
  monthly_credits: number;
  monthly_photos: number;
  used_credits: number;
  used_photos: number;
  credits_remaining: number;
  photos_remaining: number;
  days_left: number;
  is_active: boolean;
  expires_at?: string | null;
}

type BillingCycle = 'monthly' | '3_months' | '6_months' | 'yearly';

const DISCOUNTS = {
  'monthly': 0,
  '3_months': 0.15,
  '6_months': 0.20,
  'yearly': 0.25
};

const CYCLE_MONTHS = {
  'monthly': 1,
  '3_months': 3,
  '6_months': 6,
  'yearly': 12
};

// --- Components ---

const CheckIcon = ({ className }: { className?: string }) => (
  <div className={`p-1 rounded-full bg-white/10 ${className}`}>
    <Check size={14} strokeWidth={3} />
  </div>
);

const XIcon = ({ className }: { className?: string }) => (
  <div className={`p-1 rounded-full bg-white/5 ${className}`}>
    <X size={14} strokeWidth={3} />
  </div>
);

export const ShopPage: React.FC<any> = ({
  onBackToMain,
  isAuthenticated: propIsAuthenticated,
  userInfo: propUserInfo,
  onProfile,
  onShop,
  onHome,
  onLogin,
  onRegister,
  onLogout
}) => {
  const { t } = useTranslation();
  // --- State ---
  const [viewMode, setViewMode] = useState<'subscription' | 'credits'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'credits') return 'credits';
      if (tab === 'subscription') return 'subscription';
    }
    return 'subscription';
  });

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('3_months');
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated || false);
  const [userInfo, setUserInfo] = useState(propUserInfo || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [creditPackages, setCreditPackages] = useState<any[]>([]);
  const [userCountry, setUserCountry] = useState<string | null>(null);

  // --- Effects ---
  useEffect(() => {
    if (propIsAuthenticated !== undefined) setIsAuthenticated(propIsAuthenticated);
    if (propUserInfo !== undefined) {
      setUserInfo(propUserInfo);
      if (propUserInfo?.country) {
        setUserCountry(propUserInfo.country);
      }
    }
  }, [propIsAuthenticated, propUserInfo]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscriptionStats();
      loadUserInfo();
    }
    loadCreditPackages();
  }, [isAuthenticated]);

  // --- Data Loading ---
  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.country) setUserCountry(data.country);
      }
    } catch (e) { console.error(e); }
  };

  const loadSubscriptionStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/profit/stats/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (e) { console.error(e); }
  };

  const loadCreditPackages = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/subscription/credit-packages/`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) setCreditPackages(data.packages);
      }
    } catch (e) { console.error(e); }
  };

  // --- Business Logic ---
  const calculatePrice = (basePrice: number) => {
    const months = CYCLE_MONTHS[billingCycle];
    const discount = DISCOUNTS[billingCycle];
    const monthlyDiscounted = basePrice * (1 - discount);
    const roundedMonthly = Math.floor(monthlyDiscounted);
    const totalDiscounted = roundedMonthly * months;
    const totalOriginal = basePrice * months;

    return {
      monthly: roundedMonthly,
      total: totalDiscounted,
      originalMonthly: basePrice,
      originalTotal: totalOriginal,
      discountPercent: Math.round(discount * 100)
    };
  };

  const handleSubscriptionClick = (plan: string) => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    handlePayment(plan, 'sbp');
  };

  const handlePayment = async (plan: string, method: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const basePrice = plan === 'premium' ? 1199 : 449;
      const priceInfo = calculatePrice(basePrice);
      const amount = priceInfo.total;
      const description = `${plan.toUpperCase()} ${t('shop.subscription')} (${billingCycle.replace('_', ' ')})`;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/kassa/create_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          description,
          plan,
          months: CYCLE_MONTHS[billingCycle],
          payment_type: 'subscription',
          payment_method: method
        }),
      });

      if (!response.ok) throw new Error('Ошибка создания платежа');
      const data = await response.json();
      window.location.href = data.confirmation_url;
    } catch (e) { console.error(e); }
  };

  const handleTestPayment = async (plan: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const basePrice = plan === 'premium' ? 1199 : 449;
      const priceInfo = calculatePrice(basePrice);
      const amount = priceInfo.total;
      const description = `[TEST] ${plan.toUpperCase()} ${t('shop.subscription')}`;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/kassa/create_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          description,
          plan,
          months: CYCLE_MONTHS[billingCycle],
          payment_type: 'subscription',
          payment_method: 'bank_card',
          is_test: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.confirmation_url;
      }
    } catch (e) { console.error(e); }
  };

  const handleCreditPayment = async (pkg: any, method: string) => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/kassa/create_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: pkg.price,
          description: `${t('shop.buy')} ${pkg.credits} ${t('shop.creditsLower')}`,
          package_id: pkg.id,
          payment_type: 'topup',
          payment_method: method
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.confirmation_url;
      }
    } catch (e) { console.error(e); }
  };

  // --- Render Helpers ---

  const renderSubscriptionContent = () => {
    const premiumBasePrice = 1199;
    const standardBasePrice = 449;
    const premiumPrice = calculatePrice(premiumBasePrice);
    const standardPrice = calculatePrice(standardBasePrice);
    const isYearly = billingCycle === 'yearly';
    const is6Months = billingCycle === '6_months';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto flex flex-col items-center"
      >
        {/* Sale Banner */}
        <div className="w-full max-w-2xl mb-10 relative overflow-hidden rounded-xl border border-pink-500/30 bg-pink-500/5 backdrop-blur-sm p-4 flex justify-center items-center gap-4">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <span className="font-extrabold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300 tracking-wider">
            {t('shop.specialOffer')}
          </span>
          <span className="bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-pink-500/20 transform -rotate-2">
            {t('shop.discountUpTo')}
          </span>
        </div>

        {/* Duration Tabs */}
        <div className="w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 bg-white/5 rounded-full mb-12 backdrop-blur-md border border-white/10">
          {[
            { id: 'yearly', label: t('shop.billing.yearly'), save: `${t('shop.billing.save')} 25% + 15%` },
            { id: '6_months', label: t('shop.billing.sixMonths'), save: `${t('shop.billing.save')} 20% + 10%` },
            { id: '3_months', label: t('shop.billing.threeMonths'), save: `${t('shop.billing.save')} 15% + 5%` },
            { id: 'monthly', label: t('shop.billing.monthly'), save: null }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBillingCycle(tab.id as BillingCycle)}
              className="relative px-4 py-3 rounded-full text-sm font-bold transition-all duration-300 isolate"
            >
              {billingCycle === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-lg shadow-violet-500/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`relative z-10 ${billingCycle === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                {tab.label}
              </span>
              {tab.save && (
                <span className={`absolute -top-3 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-sm whitespace-nowrap z-20
                  ${billingCycle === tab.id
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-800 text-gray-300'}`}
                >
                  {tab.save}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* VPN Warning */}
        {userCountry && !['ru', 'russia'].includes(userCountry.toLowerCase()) && (
          <div className="w-full max-w-2xl mb-8 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
            {t('shop.vpnWarning')}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full items-start">

          {/* FREE PLAN */}
          <div className="relative group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl h-full min-h-[300px] flex flex-col hover:border-white/20 transition-all duration-300">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-400 mb-1">{t('tariffs.plans.free.name')}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{t('tariffs.freeLabel')}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('shop.freeForever')}</p>
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex gap-2 text-xs text-gray-300">
                <CheckIcon className="text-gray-400 bg-white/5" /> <span>{t('tariffs.plans.free.features.credits')}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-300">
                <CheckIcon className="text-gray-400 bg-white/5" /> <span>{t('shop.messageLimit')}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-300">
                <CheckIcon className="text-gray-400 bg-white/5" /> <span>{t('tariffs.plans.free.features.photos')}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-300">
                <CheckIcon className="text-gray-400 bg-white/5" /> <span>{t('tariffs.plans.free.features.allCharacters')}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-300">
                <CheckIcon className="text-gray-400 bg-white/5" /> <span>{t('shop.createOneCharacter')}</span>
              </div>
            </div>

            <button disabled className="mt-8 w-full py-4 rounded-xl font-bold bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed">
              {t('shop.currentPlan')}
            </button>
          </div>

          {/* STANDARD PLAN */}
          <motion.div
            whileHover={{ y: -8 }}
            className="relative p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 backdrop-blur-xl h-full min-h-[450px] flex flex-col"
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-amber-400 mb-1">{t('tariffs.plans.standard.name')}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{standardPrice.monthly}₽</span>
                <span className="text-gray-400 text-xs">/{t('shop.perMonth')}</span>
              </div>
              {billingCycle !== 'monthly' && (
                <p className="text-xs text-gray-500 line-through mt-1">{standardPrice.originalMonthly}₽/{t('shop.perMonth')}</p>
              )}
            </div>

            <div className="space-y-2 flex-1">
              {[
                { icon: Check, text: t('tariffs.plans.standard.features.photoGenerations'), highlight: true, amount: billingCycle === 'monthly' ? "100" : <>{isYearly ? "1200" : is6Months ? "600" : "300"} <span className="text-amber-400 font-bold">+ {isYearly ? "180" : is6Months ? "60" : "15"}</span></> },
                { icon: Check, text: t('tariffs.plans.standard.features.voiceMessages'), highlight: true, amount: billingCycle === 'monthly' ? "100" : <>{isYearly ? "1200" : is6Months ? "600" : "300"} <span className="text-amber-400 font-bold">+ {isYearly ? "180" : is6Months ? "60" : "15"}</span></> },
                { icon: Check, text: t('tariffs.plans.standard.features.allCharacters') },
                { icon: Check, text: t('tariffs.plans.standard.features.expandedMemory') },
                { icon: Check, text: t('tariffs.plans.standard.features.saveHistory') },
                { icon: Check, text: t('tariffs.plans.standard.features.createTenCharacters') },
                { icon: Check, text: t('tariffs.plans.standard.features.createPaidAlbums') },
                { icon: Check, text: t('tariffs.plans.standard.features.accessPaidAlbums') },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2 text-xs text-gray-200">
                  <CheckIcon className="text-amber-400 bg-amber-500/10" />
                  <span>
                    {item.amount && <span className="font-bold mr-1">{item.amount}</span>}
                    {item.text}
                  </span>
                </div>
              ))}

              <div className="my-2 border-t border-white/10" />

              {[
                t('tariffs.plans.standard.features.accessGalleries'),
                t('tariffs.plans.standard.features.premiumModels'),
                t('tariffs.plans.standard.features.priorityQueue'),
                t('tariffs.plans.standard.features.ownVoices'),
                t('tariffs.plans.standard.features.premiumVoices')
              ].map((text, idx) => (
                <div key={idx} className="flex gap-2 text-xs text-gray-400 opacity-80">
                  <XIcon className="text-red-500/50 bg-red-500/10" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(245, 158, 11, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSubscriptionClick('standard')}
              className="mt-6 w-full py-2.5 rounded-lg font-bold text-sm text-black bg-gradient-to-r from-amber-300 to-orange-400 shadow-lg shadow-amber-500/20 relative overflow-hidden group"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                <img src="/payment_images/pay_sbp.png?v=15" alt="SBP" className="w-5 h-5 object-contain" />
                <span>{t('shop.buyFor')} {standardPrice.total}₽</span>
              </div>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
            </motion.button>

            {userInfo?.is_admin && (
              <button
                onClick={(e) => { e.stopPropagation(); handleTestPayment('standard'); }}
                className="mt-2 w-full py-2 text-xs text-amber-500/70 hover:text-amber-500 border border-dashed border-amber-500/30 rounded-lg"
              >
                ADMIN TEST
              </button>
            )}
          </motion.div>

          {/* PREMIUM PLAN */}
          <motion.div
            whileHover={{ y: -12 }}
            className="relative p-1 rounded-2xl bg-gradient-to-b from-red-500 via-purple-600 to-transparent p-[1px] h-full min-h-[450px] flex flex-col shadow-2xl shadow-red-500/20"
          >
            <div className="absolute -top-3 w-full flex justify-center z-10">
              <span className="bg-gradient-to-r from-red-500 to-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-red-500/40 uppercase tracking-wider">
                {t('shop.bestChoice')}
              </span>
            </div>

            <div className="flex-1 rounded-[14px] bg-slate-950/90 backdrop-blur-xl p-4 flex flex-col h-full border border-white/5">

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-400">{t('tariffs.plans.premium.name')}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{premiumPrice.monthly}₽</span>
                  <span className="text-gray-400 text-xs">/{t('shop.perMonth')}</span>
                </div>
                {billingCycle !== 'monthly' && (
                  <p className="text-xs text-gray-500 line-through mt-1">{premiumPrice.originalMonthly}₽/{t('shop.perMonth')}</p>
                )}
              </div>

              <div className="space-y-2 flex-1">
                {[
                  { icon: Check, text: t('tariffs.plans.premium.features.photoGenerations'), amount: billingCycle === 'monthly' ? "300" : <>{isYearly ? "3600" : is6Months ? "1800" : "900"} <span className="text-red-400 font-bold">+ {isYearly ? "540" : is6Months ? "180" : "45"}</span></> },
                  { icon: Check, text: t('tariffs.plans.premium.features.voiceMessages'), amount: billingCycle === 'monthly' ? "300" : <>{isYearly ? "3600" : is6Months ? "1800" : "900"} <span className="text-red-400 font-bold">+ {isYearly ? "540" : is6Months ? "180" : "45"}</span></> },
                  { icon: Check, text: t('tariffs.plans.premium.features.allCharacters') },
                  { icon: Check, text: t('tariffs.plans.premium.features.deepMemory') },
                  { icon: Check, text: t('tariffs.plans.premium.features.saveHistory') },
                  { icon: Check, text: t('tariffs.plans.premium.features.createPaidAlbums') },
                  { icon: Check, text: t('tariffs.plans.premium.features.accessPaidAlbums') },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-2 text-xs text-gray-200">
                    <CheckIcon className="text-amber-400 bg-amber-500/10" />
                    <span>
                      {item.amount && <span className="font-bold mr-1">{item.amount}</span>}
                      {item.text}
                    </span>
                  </div>
                ))}

                <div className="my-2 border-t border-white/10" />

                {[
                  t('tariffs.plans.premium.features.accessGalleries'),
                  t('tariffs.plans.premium.features.premiumModels'),
                  t('tariffs.plans.premium.features.priorityQueue'),
                  t('tariffs.plans.premium.features.ownVoices'),
                  t('tariffs.plans.premium.features.unlimitedCreation'),
                  t('tariffs.plans.premium.features.premiumVoices')
                ].map((text, idx) => (
                  <div key={idx} className="flex gap-2 text-xs text-white font-medium">
                    <CheckIcon className="text-red-400 bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(220, 38, 38, 0.5)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSubscriptionClick('premium')}
                className="mt-6 w-full py-2.5 rounded-lg font-bold text-sm text-white bg-gradient-to-r from-red-500 to-purple-600 shadow-xl shadow-red-500/30 relative overflow-hidden group"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <img src="/payment_images/pay_sbp.png?v=15" alt="SBP" className="w-5 h-5 object-contain brightness-0 invert" />
                  <span>{t('shop.buyFor')} {premiumPrice.total}₽</span>
                </div>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              </motion.button>

              {userInfo?.is_admin && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleTestPayment('premium'); }}
                  className="mt-2 w-full py-2 text-xs text-red-400/70 hover:text-red-400 border border-dashed border-red-500/30 rounded-lg"
                >
                  ADMIN TEST
                </button>
              )}

            </div>
          </motion.div>

        </div>
      </motion.div>
    );
  };

  const renderCreditsContent = () => {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-6xl mx-auto"
      >
        {userCountry && !['ru', 'russia'].includes(userCountry.toLowerCase()) && (
          <div className="w-full max-w-2xl mx-auto mb-8 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
            {t('shop.vpnWarning')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {creditPackages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col hover:bg-white/[0.05] hover:border-purple-500/30 transition-all duration-300 group"
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-purple-300">{pkg.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{pkg.price}₽</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{pkg.credits} {t('shop.credits')}</p>
              </div>

              <div className="space-y-3 flex-1 mb-6">
                <div className="flex gap-2 text-sm text-gray-300">
                  <CheckIcon className="text-purple-400 bg-purple-500/10" /> <span>{t('shop.oneTimePayment')}</span>
                </div>
                <div className="flex gap-2 text-sm text-gray-300">
                  <CheckIcon className="text-purple-400 bg-purple-500/10" /> <span>{t('shop.creditsNeverExpire')}</span>
                </div>
                <div className="flex gap-2 text-sm text-gray-300">
                  <CheckIcon className="text-purple-400 bg-purple-500/10" /> <span>{t('shop.forAnyGeneration')}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); handleCreditPayment(pkg, 'sbp'); }}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/20 relative overflow-hidden"
              >
                <div className="flex items-center justify-center gap-2 relative z-10">
                  <img src="/payment_images/pay_sbp.png?v=15" alt="SBP" className="w-5 h-5 object-contain brightness-0 invert" />
                  <span>{t('shop.buy')}</span>
                </div>
              </motion.button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white font-sans overflow-x-hidden selection:bg-purple-500/30">
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>

      <main className="relative z-10 pt-4 pb-10 px-4 flex flex-col items-center">
        <div className="w-full">
          {renderSubscriptionContent()}
        </div>
      </main>

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(accessToken, refreshToken) => {
            authManager.setTokens(accessToken, refreshToken);
            setIsAuthenticated(true);
            setIsAuthModalOpen(false);
            loadSubscriptionStats(); // Reload after login
          }}
        />
      )}
    </div>
  );
};

// --- Subcomponents ---

const BackgroundWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
    {children}
  </div>
);

export default ShopPage;
