import { Routes, Route, Navigate } from 'react-router-dom';
import { ccc } from '@ckb-ccc/connector-react';
import { Layout } from './Layout';
import { KeystoreProvider } from './contexts/KeystoreContext';
import { PdsProvider } from './contexts/PdsContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { RegistrationWizard } from './components/RegistrationWizard';
import { Web5Apps } from './components/Web5Apps';
import { UserSettings } from './components/UserSettings';

function AppRoutes() {
  const { isLoggedIn } = useUser();

  return (
    <Routes>
      <Route path="/register" element={
        isLoggedIn ? <Navigate to="/apps" replace /> : <RegistrationWizard onComplete={() => {}} />
      } />
      
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/apps" replace />} />
        <Route path="apps" element={<Web5Apps />} />
        <Route path="settings" element={<UserSettings />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/apps" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ccc.Provider
      clientOptions={[
        {
          name: 'Testnet',
          client: new ccc.ClientPublicTestnet(),
        },
        {
          name: 'Mainnet',
          client: new ccc.ClientPublicMainnet(),
        },
      ]}
    >
      <UserProvider>
        <KeystoreProvider>
          <PdsProvider>
            <AppRoutes />
          </PdsProvider>
        </KeystoreProvider>
      </UserProvider>
    </ccc.Provider>
  );
}

export default App;
