import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import Home from '@/pages/Home';
import Auth from '@/pages/Auth';
import ProductDetail from '@/pages/ProductDetail';
import Profile from '@/pages/Profile';
import Catalog from '@/pages/Catalog';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/producto/:id" element={<ProductDetail />} />
            <Route path="/perfil" element={<Profile />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
