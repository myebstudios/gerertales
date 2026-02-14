
import React from 'react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';

interface SubscriptionPlansProps {
  userProfile: UserProfile;
  userId: string;
  userEmail: string;
  onUpdateTier?: (tier: string) => void;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ userProfile, userId, userEmail, onUpdateTier }) => {
  const plans = [
    {
      id: 'free',
      name: 'Writer',
      price: '$0',
      description: 'Perfect for getting started.',
      features: ['50 Starting Credits', 'Cloud Sync', '1 Active Story'],
      buttonText: 'Current Plan',
      isCurrent: userProfile.subscriptionTier === 'free' || !userProfile.subscriptionTier,
      priceId: ''
    },
    {
      id: 'pro',
      name: 'Author',
      price: '$12/mo',
      description: 'For serious storytellers.',
      features: ['500 Monthly Credits', 'NVIDIA NIM Access', 'Unlimited Stories', 'Priority Support'],
      buttonText: 'Upgrade to Pro',
      isCurrent: userProfile.subscriptionTier === 'pro',
      priceId: 'price_1QscHlAmRnd0e8S0T6p9xS0s' // Updated with a test Price ID
    },
    {
      id: 'studio',
      name: 'Studio',
      price: '$29/mo',
      description: 'The ultimate creative suite.',
      features: ['Unlimited Credits*', 'Custom AI Personas', 'Early Access Features', 'Shared Projects'],
      buttonText: 'Join Studio',
      isCurrent: userProfile.subscriptionTier === 'studio',
      priceId: 'price_1QscInAmRnd0e8S0Y8j4zQ2k' // Updated with a test Price ID
    }
  ];

  const handleSubscribe = async (planId: string) => {
    if (!planId || planId === 'free') return;

    if (onUpdateTier) {
        onUpdateTier(planId);
        return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
            priceId: plans.find(p => p.id === planId)?.priceId, 
            userId, 
            customerEmail: userEmail
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Subscription error:', err);
    }
  };

  return (
    <div className="py-12 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-serif text-text-main mb-4">Choose Your Path</h2>
        <p className="text-zinc-400">Unlock your full creative potential with a premium plan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`bg-dark-surface border p-8 rounded-2xl flex flex-col transition-all duration-300 hover:scale-[1.02]
              ${plan.isCurrent ? 'border-cobalt shadow-lg shadow-cobalt/10' : 'border-dark-border'}`}
          >
            <div className="mb-8">
              <h3 className="text-xl font-bold text-text-main mb-2">{plan.name}</h3>
              <div className="text-4xl font-serif text-text-main mb-2">
                {plan.price}<span className="text-sm font-sans text-zinc-500">/mo</span>
              </div>
              <p className="text-sm text-zinc-400">{plan.description}</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <svg className="w-5 h-5 text-cobalt flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={plan.isCurrent || (plan.id === 'free' && !plan.priceId)}
              className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all
                ${plan.isCurrent 
                  ? 'bg-zinc-800 text-zinc-500 cursor-default' 
                  : 'bg-cobalt text-white hover:bg-blue-500 shadow-lg shadow-cobalt/20 active:scale-95'}`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
