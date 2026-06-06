import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

// Import Semua Halaman Sub-Menu
import OrderOasePPN from './pages/orderoaseppn';
import OrderOasePolos from './pages/orderoasepolos';
import OrderMapPPN from './pages/ordermapppn';
import OrderMapPolos from './pages/ordermappolos';
import JadwalAbadi from './pages/jadwalabadi';
import UpdateKomersil from './pages/updatekomersil';
import FullKontainer from './pages/fullkontainer';

export default function App() {
    return (
        <HashRouter>
            <Routes>
                {/* Halaman Menu Utama (Carousel 3D) */}
                <Route path="/" element={<Home />} />

                {/* Halaman Aplikasi Sub-Menu */}
                <Route path="/orderoaseppn" element={<OrderOasePPN />} />
                <Route path="/orderoasepolos" element={<OrderOasePolos />} />
                <Route path="/ordermapppn" element={<OrderMapPPN />} />
                <Route path="/ordermappolos" element={<OrderMapPolos />} />
                <Route path="/jadwalabadi" element={<JadwalAbadi />} />
                <Route path="/updatekomersil" element={<UpdateKomersil />} />
                <Route path="/fullkontainer" element={<FullKontainer />} />
            </Routes>
        </HashRouter>
    );
}