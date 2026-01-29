import './Hero.css';

const Hero = () => {
    const handleSeePrices = () => {
        // For MVP, show a "Coming Soon" alert or collect interest
        alert('🚀 Coming Soon! We\'ll notify you when RideShare Connect launches in your area.');
    };

    const handleScheduleLater = () => {
        alert('📅 Schedule a ride for later - Feature launching soon!');
    };

    return (
        <section id="hero" className="hero">
            <div className="hero__container">
                {/* Left Side - Request Card */}
                <div className="hero__card-wrapper">
                    <div className="hero__card">
                        <h2 className="hero__card-title">
                            Request a ride for now or later
                        </h2>

                        <div className="hero__inputs">
                            <div className="hero__input-group">
                                <div className="hero__input-icon hero__input-icon--pickup">
                                    <span className="hero__dot"></span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Pickup location"
                                    className="hero__input"
                                    id="pickup-location"
                                />
                            </div>

                            <div className="hero__input-connector"></div>

                            <div className="hero__input-group">
                                <div className="hero__input-icon hero__input-icon--dropoff">
                                    <span className="hero__square"></span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Dropoff location"
                                    className="hero__input"
                                    id="dropoff-location"
                                />
                            </div>
                        </div>

                        <div className="hero__buttons">
                            <button
                                className="btn btn-primary btn-lg hero__btn-primary"
                                onClick={handleSeePrices}
                            >
                                See Prices
                            </button>
                            <button
                                className="btn btn-secondary btn-lg"
                                onClick={handleScheduleLater}
                            >
                                Schedule for Later
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side - Hero Image */}
                <div className="hero__image">
                    <div className="hero__image-content">
                        <div className="hero__image-overlay"></div>
                        <div className="hero__tagline">
                            <h1>Your ride, your way</h1>
                            <p>Smart carpooling with partial-route matching</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
