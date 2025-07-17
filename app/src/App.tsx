import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import { AuthContextProvider } from './context/AuthContext';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <AuthContextProvider>
        <div className="min-h-screen bg-gray-900">
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#374151',
                color: '#f3f4f6',
                border: '1px solid #4b5563',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#374151',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#374151',
                },
              },
            }}
          />
          <Layout />
        </div>
      </AuthContextProvider>
    </BrowserRouter>
  );
}

export default App;