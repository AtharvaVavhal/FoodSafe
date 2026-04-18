import { Navigate } from 'react-router-dom';
import { useStore } from '../store';

export default function ProtectedRoute({ children }) {
  const { refreshToken } = useStore();

  // Allow if there's a refresh token — accessToken may still be loading on page reload
  if (!refreshToken) {
    return <Navigate to="/auth" replace />;
  }

  // If you want the "Home" page to be the scan page for logged-in users:
  // You can handle that in your App.jsx or here.
  
  return children;
}