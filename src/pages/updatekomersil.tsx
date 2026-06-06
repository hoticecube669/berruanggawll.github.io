import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function UpdateKomersil() {
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState<string | null>(null);
    const [notification, setNotification] = useState({ visible: false, message: '' });
    const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showNotification = (message: string) => {
        if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
        setNotification({ visible: true, message });
        notifTimeoutRef.current = setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
        }, 2000);
    };

    const parseNumber = (str: string) => {
        if (!str || str.trim() === '-' || str.trim() === '') return 0;
        let cleaned = str.replace(/[^\d.,-]/g, '');
        if (cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            cleaned = cleaned.replace(/\./g, '');
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const formatNumber = (num: number) => num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatData = () => {
        if (!inputText.trim()) {
            showNotification('Silakan masukkan data terlebih dahulu!');
            return;
        }

        const lines = inputText.split(/\r?\n/).filter(line => line.trim() !== '');
        const results = [];
        let totalAlokasi = 0;

        for (const line of lines) {
            if (line.toLowerCase().includes('harga') && line.toLowerCase().includes('kode')) continue;

            if (line.toLowerCase().includes('total')) {
                const parts = line.split(/\t|\s{2,}/);
                for (const part of parts) {
                    const num = parseNumber(part);
                    if (num > 0) totalAlokasi = num;
                }
                continue;
            }

            const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(p => p !== '');
            if (parts.length < 4) continue;

            const harga = parseNumber(parts[0]);
            const kode = parts[1];
            const alokasi = parseNumber(parts[3]);
            const sisa = parseNumber(parts[4] || '0');

            if (kode && kode !== '-') {
                results.push({ kode, harga, alokasi, sisa });
            }
        }

        let output = `*ALOKASI KOMERSIL*\n\n`;
        results.forEach(item => {
            output += `${item.kode} Rp ${formatNumber(item.harga)},- ${formatNumber(item.alokasi)} kg\n`;
            output += `*Sisa ${formatNumber(item.sisa)} kg*\n\n`;
        });
        output += `*TOTAL ${formatNumber(totalAlokasi)} kg*`;

        setOutputText(output);
        showNotification('Data berhasil diproses!');
    };

    // Fungsi Copy Anti-Gagal (dengan Fallback)
    const handleCopy = () => {
        if (!outputText) {
            showNotification('Tidak ada data untuk disalin!');
            return;
        }

        // Coba cara modern dulu
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(outputText)
                .then(() => showNotification('Data berhasil disalin!'))
                .catch(() => fallbackCopyTextToClipboard(outputText));
        } else {
            // Jika tidak mendukung, gunakan cara cadangan
            fallbackCopyTextToClipboard(outputText);
        }
    };

    // Fungsi Cadangan
    const fallbackCopyTextToClipboard = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Sembunyikan textarea agar tidak mengganggu UI
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            showNotification('Data berhasil disalin!');
        } catch (err) {
            showNotification('Gagal menyalin, mohon copy manual.');
        }

        document.body.removeChild(textArea);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 font-mono relative">
            <div className="max-w-5xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-[#00D4FF] mb-6 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span> KEMBALI KE MENU
                </Link>

                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00D4FF]">ALOKASI KOMERSIL</h1>
                </header>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-[#151515]/70 border border-white/10 p-6 rounded-2xl">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="w-full h-80 bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-[#00D4FF]"
                            placeholder="Paste data Excel Anda di sini..."
                        />
                        <div className="flex gap-2 mt-4">
                            <button onClick={formatData} className="flex-1 bg-[#00D4FF]/20 border border-[#00D4FF]/30 py-3 rounded-xl hover:bg-[#00D4FF]/30 transition-all font-bold tracking-widest">FORMAT</button>
                            <button onClick={() => { setInputText(''); setOutputText(null) }} className="px-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">🗑️</button>
                        </div>
                    </div>

                    <div className="bg-[#151515]/70 border border-white/10 p-6 rounded-2xl">
                        <div className="w-full h-80 bg-black/40 border border-white/10 rounded-xl p-4 text-sm overflow-auto whitespace-pre-wrap">
                            {outputText || <div className="h-full flex items-center justify-center opacity-30">Hasil akan muncul di sini...</div>}
                        </div>
                        <button onClick={handleCopy} className="w-full mt-4 bg-emerald-500/20 border border-emerald-500/30 py-3 rounded-xl hover:bg-emerald-500/30 transition-all font-bold tracking-widest">
                            COPY KE CLIPBOARD
                        </button>
                    </div>
                </div>
            </div>

            <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-xl border border-[#00D4FF]/40 bg-[#111111]/90 text-[#00D4FF] shadow-[0_0_30px_rgba(0,212,255,0.3)] backdrop-blur-md transition-all duration-300 z-[9999] text-center font-bold tracking-wider md:text-base text-sm min-w-[280px]
                ${notification.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                {notification.message}
            </div>
        </div>
    );
}