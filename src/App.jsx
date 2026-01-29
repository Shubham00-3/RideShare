import './index.css';
import Header from './components/Header';
import Hero from './components/Hero';
import BusinessModel from './components/BusinessModel';
import Comparison from './components/Comparison';
import Team from './components/Team';
import Footer from './components/Footer';

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <BusinessModel />
        <Comparison />
        <Team />
      </main>
      <Footer />
    </div>
  );
}

export default App;
