import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Only use ClerkProvider if key is configured
const AppWithAuth = clerkPubKey ? (
  <ClerkProvider publishableKey={clerkPubKey}>
    <App />
  </ClerkProvider>
) : (
  <App />
);

root.render(
  <React.StrictMode>
    {AppWithAuth}
  </React.StrictMode>
);