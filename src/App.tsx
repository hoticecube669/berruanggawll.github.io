import React, { useState, useEffect, useRef } from 'react';
import { Mouse } from 'lucide-react';

// --- DATA ITEM CAROUSEL ---
const CAROUSEL_ITEMS = [
    { id: 0, title: "Order Oase PPN", path: "/orderoaseppn" },
    { id: 1, title: "Order Oase Polos", path: "/orderoasepolos" },
    { id: 2, title: "Order MAP PPN", path: "/ordermapppn" },
    { id: 3, title: "Order MAP Polos", path: "/ordermappolos" },
    { id: 4, title: "Kalkulator Kontainer", path: "/fullontainer" },
    { id: 5, title: "Update Komersil", path: "/updatekomersil" },
    { id: 6, title: "Jadwal Abadi", path: "/jadwalabadi" },
    { id: 7, title: "Blog", path: "/blog" },
    { id: 8, title: "Contact", path: "/contact" },
    { id: 9, title: "Settings", path: "/settings" }
];

const TOTAL_ITEMS = CAROUSEL_ITEMS.length;
const ITEM_SPACING = 70; // Jarak antar kartu (dibuat berdekatan)

export default function App() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [navigatingTo, setNavigatingTo] = useState(null);

    // Refs untuk mengontrol elemen DOM secara langsung demi performa 60 FPS
    const containerRef = useRef(null);
    const itemRefs = useRef([]);

    // Menyimpan nilai scroll saat ini dan target (sebagai indeks float)
    const targetScroll = useRef(0);
    const currentScroll = useRef(0);

    // State interaksi
    const isDragging = useRef(false);
    const startY = useRef(0);
    const snapTimeout = useRef(null);
    const rafId = useRef(null);

    // --- LOGIKA ANIMASI & SCROLL (60 FPS) ---
    useEffect(() => {
        const loop = () => {
            // Lerp (Linear Interpolation) untuk pergerakan yang sangat smooth
            currentScroll.current += (targetScroll.current - currentScroll.current) * 0.08;

            // Hitung indeks aktif saat ini
            let normalizedScroll = currentScroll.current % TOTAL_ITEMS;
            if (normalizedScroll < 0) normalizedScroll += TOTAL_ITEMS;

            const newActiveIndex = Math.round(normalizedScroll) % TOTAL_ITEMS;

            if (newActiveIndex !== activeIndex) {
                setActiveIndex(newActiveIndex);
            }

            // Update posisi dan gaya untuk setiap kartu
            CAROUSEL_ITEMS.forEach((_, i) => {
                const el = itemRefs.current[i];
                if (!el) return;

                // Hitung jarak elemen dari posisi tengah (0)
                let offset = ((i - currentScroll.current) % TOTAL_ITEMS + TOTAL_ITEMS) % TOTAL_ITEMS;

                // Ubah menjadi rentang -TOTAL_ITEMS/2 hingga TOTAL_ITEMS/2 (supaya loop tak terbatas)
                if (offset > TOTAL_ITEMS / 2) offset -= TOTAL_ITEMS;

                const absOffset = Math.abs(offset);

                // Translasi vertikal lurus (Standard Vertical)
                const translateY = offset * ITEM_SPACING;

                // Skala dan Opacity sedikit mengecil jika menjauh dari tengah untuk memberikan depth
                const scale = Math.max(0.85, 1 - absOffset * 0.04);
                const opacity = Math.max(0, 1 - absOffset * 0.25);
                const zIndex = Math.round(100 - absOffset * 10);

                // Terapkan modifikasi style secara langsung tanpa re-render React state
                el.style.transform = `translateY(${translateY}px) scale(${scale})`;
                el.style.opacity = opacity;
                el.style.zIndex = zIndex;
            });

            rafId.current = requestAnimationFrame(loop);
        };

        loop(); // Mulai loop animasi

        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [activeIndex]);

    // --- EVENT HANDLERS (Wheel & Touch) ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            e.preventDefault();
            // Menambah target scroll indeks berdasarkan kecepatan scroll mouse
            targetScroll.current += e.deltaY * 0.003;
            triggerSnap();
        };

        const handleTouchStart = (e) => {
            isDragging.current = true;
            startY.current = e.touches[0].clientY;
            if (snapTimeout.current) clearTimeout(snapTimeout.current);
        };

        const handleTouchMove = (e) => {
            if (!isDragging.current) return;
            const currentY = e.touches[0].clientY;
            const deltaY = startY.current - currentY;

            // Mengurangi sensitivitas scroll mobile agar lebih mudah memilih
            targetScroll.current += deltaY * 0.015;
            startY.current = currentY;
        };

        const handleTouchEnd = () => {
            isDragging.current = false;
            triggerSnap();
        };

        // Auto snap / berhenti paskan ke item terdekat
        const triggerSnap = () => {
            if (snapTimeout.current) clearTimeout(snapTimeout.current);
            snapTimeout.current = setTimeout(() => {
                targetScroll.current = Math.round(targetScroll.current);
            }, 150);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    // --- INTERAKSI KLIK ---
    const handleItemClick = (index, item) => {
        if (index === activeIndex) {
            // Jika diklik item yang sudah di tengah
            setNavigatingTo(item);
            setTimeout(() => {
                setNavigatingTo(null);
                // Mengarahkan ke link setelah animasi selesai
                if (item.path.startsWith('http')) {
                    window.open(item.path, '_blank'); // Buka tab baru untuk link eksternal
                } else {
                    window.location.href = item.path; // Navigasi ke halaman internal
                }
            }, 2000);
        } else {
            // Menghitung jarak putar terpendek menuju item yang diklik
            let diff = index - activeIndex;
            if (diff > TOTAL_ITEMS / 2) diff -= TOTAL_ITEMS;
            if (diff < -TOTAL_ITEMS / 2) diff += TOTAL_ITEMS;

            targetScroll.current += diff;
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-screen h-screen overflow-hidden bg-[#0A0A0A] text-white font-sans selection:bg-[#00D4FF]/30"
        >
            {/* Background Effects (Particles / Glow) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Soft center glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D4FF] opacity-[0.03] blur-[120px] rounded-full"></div>
                {/* Secondary background subtle gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#151515]/50 to-[#0A0A0A]"></div>
            </div>

            {/* --- DYNAMIC TITLE SECTION --- */}
            <div className="absolute top-[12%] left-0 w-full flex justify-center z-20 pointer-events-none">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Sixtyfour+Convergence&display=swap');
                </style>
                <div className="relative h-20 w-full flex justify-center items-center">
                    {CAROUSEL_ITEMS.map((item, index) => (
                        <h1
                            key={`title-${item.id}`}
                            style={{ fontFamily: '"Sixtyfour Convergence", sans-serif' }}
                            className={`absolute text-4xl md:text-6xl font-bold tracking-tight transition-all duration-500 ease-out
                ${index === activeIndex
                                    ? 'opacity-100 translate-y-0 scale-100 drop-shadow-[0_0_20px_rgba(0,212,255,0.4)] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70'
                                    : 'opacity-0 translate-y-8 scale-90 text-[#A0A0A0]'
                                }`}
                        >
                            {item.title}
                        </h1>
                    ))}
                </div>
            </div>

            {/* --- STANDARD VERTICAL CAROUSEL SECTION --- */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                {/* Kontainer carousel vertikal */}
                <div className="relative w-full max-w-[260px] h-[64px] flex items-center justify-center">
                    {CAROUSEL_ITEMS.map((item, index) => {
                        const isActive = index === activeIndex;

                        return (
                            <div
                                key={`card-${item.id}`}
                                ref={(el) => (itemRefs.current[index] = el)}
                                onClick={() => handleItemClick(index, item)}
                                className={`absolute w-full h-full flex items-center justify-center rounded-xl cursor-pointer transition-colors duration-300 ease-out border shadow-lg
                  ${isActive
                                        ? 'bg-[#151515] border-[#00D4FF] shadow-[0_0_25px_rgba(0,212,255,0.25)] text-white'
                                        : 'bg-[#151515]/70 backdrop-blur-sm border-white/5 text-[#A0A0A0] hover:bg-[#151515] hover:border-white/20 hover:text-white'
                                    }
                `}
                            >
                                <span style={{ fontFamily: '"Share Tech Mono", monospace' }} className={`text-xl tracking-widest uppercase ${isActive ? 'text-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.6)]' : ''}`}>
                                    {item.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- INSTRUCTION FOOTER --- */}
            <div className="absolute bottom-10 left-0 w-full flex flex-col items-center justify-center text-[#A0A0A0] gap-2 z-0 pointer-events-none opacity-60">
                <Mouse size={24} className="animate-bounce text-white/50" />
                <p className="text-sm tracking-wide font-medium">Scroll or Swipe</p>
            </div>

            {/* --- SIMULASI NAVIGATION OVERLAY --- */}
            <div
                className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A] transition-all duration-700 ease-in-out
          ${navigatingTo ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-110'}
        `}
            >
                {navigatingTo && (
                    <>
                        <div className="absolute inset-0 bg-gradient-radial from-[#00D4FF]/20 to-transparent opacity-50 blur-3xl"></div>
                        <div className="w-20 h-20 rounded-full border-t-2 border-r-2 border-[#00D4FF] animate-spin mb-8"></div>
                        <h2 style={{ fontFamily: '"Share Tech Mono", monospace' }} className="text-3xl text-white mb-2 uppercase tracking-widest">Entering</h2>
                        <p className="text-xl text-[#00D4FF] font-medium tracking-widest uppercase glow-text">
                            {navigatingTo.title}
                        </p>
                        <p className="text-[#A0A0A0] mt-4 font-mono text-sm">Navigation to {navigatingTo.path}</p>
                    </>
                )}
            </div>

        </div>
    );
}