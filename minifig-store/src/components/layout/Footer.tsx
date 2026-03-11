import { Link } from 'react-router-dom';
import { Package, Instagram, Facebook, MessageCircle } from 'lucide-react';

export function Footer() {
    const year = new Date().getFullYear();
    const wa = `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER ?? '51949784120'}`;

    return (
        <footer style={{ backgroundColor: '#1A1A2E' }} className="text-gray-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">

                    {/* Brand */}
                    <div className="col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-syne font-bold text-white text-lg">
                                Minifig<span style={{ color: '#F26522' }}>Store</span>
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-[200px]">
                            Tu tienda de minifiguras. Los personajes más icónicos para tu colección.
                        </p>
                        <div className="flex gap-2">
                            <a href={wa} target="_blank" rel="noreferrer"
                                className="p-2 bg-white/10 rounded-lg hover:bg-green-600 transition-colors" title="WhatsApp">
                                <MessageCircle className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-pink-600 transition-colors" title="Instagram">
                                <Instagram className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-blue-600 transition-colors" title="Facebook">
                                <Facebook className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Tienda */}
                    <div>
                        <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Tienda</h4>
                        <ul className="space-y-2.5 text-sm text-gray-400">
                            <li><Link to="/catalogo" className="hover:text-orange-400 transition-colors">Catálogo</Link></li>
                            <li><Link to="/catalogo?cat=novedades" className="hover:text-orange-400 transition-colors">Novedades</Link></li>
                            <li><Link to="/catalogo?cat=ofertas" className="hover:text-orange-400 transition-colors">Ofertas</Link></li>
                            <li><button className="hover:text-orange-400 transition-colors">Mi carrito</button></li>
                        </ul>
                    </div>

                    {/* Cuenta */}
                    <div>
                        <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Cuenta</h4>
                        <ul className="space-y-2.5 text-sm text-gray-400">
                            <li><Link to="/auth" className="hover:text-orange-400 transition-colors">Iniciar sesión</Link></li>
                            <li><Link to="/mis-pedidos" className="hover:text-orange-400 transition-colors">Mis pedidos</Link></li>
                            <li><Link to="/perfil" className="hover:text-orange-400 transition-colors">Mi perfil</Link></li>
                        </ul>
                    </div>

                    {/* Ayuda */}
                    <div>
                        <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Ayuda</h4>
                        <ul className="space-y-2.5 text-sm text-gray-400">
                            <li><a href={wa} target="_blank" rel="noreferrer" className="hover:text-orange-400 transition-colors">Cómo pedir</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Envíos</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Garantía</a></li>
                            <li><a href={wa} target="_blank" rel="noreferrer" className="hover:text-orange-400 transition-colors">Contacto</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 mt-12 pt-6 text-center text-xs text-gray-500">
                    © {year} MinifigStore. Todos los derechos reservados.
                </div>
            </div>
        </footer>
    );
}
