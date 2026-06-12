import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Features } from './pages/Features';
import { Pricing } from './pages/Pricing';
import { Solutions } from './pages/Solutions';
import { Community } from './pages/Community';
import { Help } from './pages/Help';
import { Docs } from './pages/Docs';
import { Learn } from './pages/Learn';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Account } from './pages/Account';
import { Interface } from './pages/Interface';
import { MobileApp } from './pages/MobileApp';
import { Beacon } from './pages/Beacon';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { CustomerArea } from './pages/CustomerArea';
import { SensoryCommunications } from './pages/SensoryCommunications';
import { SignUp } from './pages/SignUp';
import { Login } from './pages/Login';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <BrowserRouter basename="/portal">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/community" element={<Community />} />
          <Route path="/help" element={<Help />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/account" element={<Account />} />
          <Route path="/interface" element={<Interface />} />
          <Route path="/mobile-app" element={<MobileApp />} />
          <Route path="/beacon" element={<Beacon />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/customer-area" element={<CustomerArea />} />
          <Route path="/sensory-communications" element={<SensoryCommunications />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
