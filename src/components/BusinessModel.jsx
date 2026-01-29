import { useState } from 'react';
import './BusinessModel.css';

const driverFeatures = [
    {
        icon: '🔄',
        title: 'No More Empty Return Trips',
        description: 'Turn deadhead miles into revenue. Use our Return Trip Discounting to offer 20-50% off on return journeys instead of driving back empty.'
    },
    {
        icon: '👥',
        title: 'Shared Rides, Higher Earnings',
        description: 'Earn 12-18% more on shared rides. We optimize routes so you get paid more for the same distance.'
    },
    {
        icon: '⭐',
        title: 'Keep Your Quality Streak',
        description: 'Hit 5 consecutive 5-star rides to unlock Premium Priority. Get access to high-value airport and corporate rides.'
    },
    {
        icon: '⚡',
        title: 'Transparent Onboarding',
        description: 'Start earning in 48-72 hours. Simple, paperless onboarding with instant verification.'
    }
];

const passengerFeatures = [
    {
        icon: '🛤️',
        title: 'Partial-Route Matching',
        description: "Don't wait for a perfect match. We match you with riders going in your general direction, increasing availability by 40%."
    },
    {
        icon: '💰',
        title: 'Fair Split Pricing',
        description: 'Pay only for the distance you travel. Save 40-50% compared to solo rides.'
    },
    {
        icon: '➕',
        title: 'Mid-Trip Pickup',
        description: 'Started solo? Let a rider join mid-way and watch your fare drop instantly.'
    }
];

const BusinessModel = () => {
    const [activeTab, setActiveTab] = useState('drivers');

    return (
        <section id="business-model" className="business-model section">
            <div className="container">
                <div className="section-header">
                    <h2>Our Business Model</h2>
                    <p>See how RideShare Connect benefits everyone in the ecosystem</p>
                </div>

                {/* Toggle Switch */}
                <div className="business-model__toggle">
                    <button
                        className={`business-model__toggle-btn ${activeTab === 'passengers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('passengers')}
                    >
                        For Passengers
                    </button>
                    <button
                        className={`business-model__toggle-btn ${activeTab === 'drivers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('drivers')}
                    >
                        For Drivers
                    </button>
                    <div
                        className="business-model__toggle-indicator"
                        style={{ transform: activeTab === 'drivers' ? 'translateX(100%)' : 'translateX(0)' }}
                    />
                </div>

                {/* Content */}
                <div className="business-model__content">
                    {activeTab === 'drivers' ? (
                        <div className="business-model__view animate-fade-in-up" key="drivers">
                            <h3 className="business-model__headline">
                                Earn More, Drive Smarter, Get Recognized.
                            </h3>
                            <div className="business-model__grid grid grid-4">
                                {driverFeatures.map((feature, index) => (
                                    <div
                                        key={feature.title}
                                        className="feature-card card"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="feature-card__icon">{feature.icon}</div>
                                        <h4 className="feature-card__title">{feature.title}</h4>
                                        <p className="feature-card__description">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="business-model__view animate-fade-in-up" key="passengers">
                            <h3 className="business-model__headline">
                                Smart Carpooling with Dynamic Route Matching.
                            </h3>
                            <div className="business-model__grid grid grid-3">
                                {passengerFeatures.map((feature, index) => (
                                    <div
                                        key={feature.title}
                                        className="feature-card card"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="feature-card__icon">{feature.icon}</div>
                                        <h4 className="feature-card__title">{feature.title}</h4>
                                        <p className="feature-card__description">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default BusinessModel;
