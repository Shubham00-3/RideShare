import './Team.css';

const teamMembers = [
    {
        name: 'Aditya',
        role: 'Co-Founder / Technology Lead',
        bio: 'Driving the technical architecture and algorithm design for dynamic partial-route matching.',
        avatar: '👨‍💻'
    },
    {
        name: 'Shubham',
        role: 'Co-Founder / Operations & Strategy',
        bio: 'Focusing on driver economics, sustainable fleet management, and business modeling.',
        avatar: '📊'
    },
    {
        name: 'Yavish',
        role: 'Co-Founder / Growth & Experience',
        bio: 'Spearheading user acquisition, UI/UX design, and community building.',
        avatar: '🚀'
    }
];

const Team = () => {
    return (
        <section id="team" className="team section">
            <div className="container">
                <div className="section-header">
                    <h2>Building the Future of Indian Commute</h2>
                    <p>Meet the team behind RideShare Connect</p>
                </div>

                <div className="team__grid grid grid-3">
                    {teamMembers.map((member, index) => (
                        <div
                            key={member.name}
                            className="team__card card"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="team__avatar">{member.avatar}</div>
                            <h3 className="team__name">{member.name}</h3>
                            <p className="team__role">{member.role}</p>
                            <p className="team__bio">{member.bio}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Team;
