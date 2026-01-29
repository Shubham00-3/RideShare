import { useEffect, useRef, useState } from 'react';
import './Comparison.css';

const Comparison = () => {
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const competitorEarnings = 75000;
    const rideShareEarnings = 96250;
    const maxEarnings = 100000;

    return (
        <section className="comparison section" ref={sectionRef}>
            <div className="container">
                <div className="section-header">
                    <h2>Why Choose Us?</h2>
                    <p>See how much more you can earn with RideShare Connect</p>
                </div>

                <div className="comparison__chart">
                    <div className="comparison__bars">
                        {/* Competitor Bar */}
                        <div className="comparison__bar-container">
                            <div className="comparison__bar-label">
                                <span className="comparison__bar-title">Competitors</span>
                                <span className="comparison__bar-subtitle">High Commission + Empty Miles</span>
                            </div>
                            <div className="comparison__bar-wrapper">
                                <div
                                    className={`comparison__bar comparison__bar--competitor ${isVisible ? 'animate' : ''}`}
                                    style={{ '--target-width': `${(competitorEarnings / maxEarnings) * 100}%` }}
                                >
                                    <span className="comparison__bar-value">₹{competitorEarnings.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* RideShare Bar */}
                        <div className="comparison__bar-container">
                            <div className="comparison__bar-label">
                                <span className="comparison__bar-title">RideShare Connect</span>
                                <span className="comparison__bar-subtitle">Low Commission + Return Trip Revenue</span>
                            </div>
                            <div className="comparison__bar-wrapper">
                                <div
                                    className={`comparison__bar comparison__bar--rideshare ${isVisible ? 'animate' : ''}`}
                                    style={{ '--target-width': `${(rideShareEarnings / maxEarnings) * 100}%` }}
                                >
                                    <span className="comparison__bar-value">₹{rideShareEarnings.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`comparison__caption ${isVisible ? 'animate' : ''}`}>
                        <div className="comparison__badge">+29%</div>
                        <p>Drivers earn <strong>~29% more</strong> with RideShare Connect</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Comparison;
