import { Navigate } from 'react-router-dom';
import { useStore } from '../store';

export default function ProtectedRoute({ children }) {
  const { token, user } = useStore();

  if (!token) {
    // If not logged in, go to auth
    return <Navigate to="/auth" replace />;
  }

  // If you want the "Home" page to be the scan page for logged-in users:
  // You can handle that in your App.jsx or here.
  
  return children;
}