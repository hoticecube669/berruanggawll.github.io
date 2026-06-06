import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

// --- KTP (Interface) untuk TypeScript ---
interface OrderItem {
    code: string;
    qty: number;
}

interface FormatOptions {
    showHarga: boolean;
    showHD: boolean;
    showPPN: boolean;
    showHandlingTotal: boolean;
    showNB: boolean;
    appendBankInfo?: boolean;
    appendHDBankInfo?: boolean;
    appendPPNBankInfo?: boolean;
}
// ----------------------------------------

export default function OrderOasePPN() {
    const [inputText, setInputText] = useState('');
    const [isMobileView, setIsMobileView] = useState(true);
    const [outputs, setOutputs] = useState({
        lengkap: '',
        plain: '',
        noHd: '',
        handlingOnly: ''
    });

    const [notification, setNotification] = useState({ visible: false, message: '', isError: false });
    const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value).replace('Rp', 'Rp ') + ',-';
    };

    const parseOrderLine = (line: string) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || /^(tgl p\.o|harga|nb\s*:|ambil|kirim)/i.test(trimmedLine) || /^(senin|selasa|rabu|kamis|jumat|sabtu|minggu)/i.test(trimmedLine)) return null;

        let customerName: string;
        let itemsStr: string;
        const items: OrderItem[] = [];
        const commaIndex = trimmedLine.indexOf(',');

        if (commaIndex !== -1) {
            customerName = trimmedLine.substring(0, commaIndex).trim();
            itemsStr = trimmedLine.substring(commaIndex + 1).trim();
        } else {
            const parts = trimmedLine.split(/\s+/).filter(p => p);
            if (parts.length < 3) return null;
            const lastPart = parts[parts.length - 1];
            if (isNaN(parseInt(lastPart, 10))) return null;

            let firstItemWordIndex = parts.length - 2;
            for (let i = parts.length - 2; i > 0; i--) {
                if (!/^\d+$/.test(parts[i - 1])) firstItemWordIndex = i - 1;
                else break;
            }
            customerName = parts.slice(0, firstItemWordIndex).join(' ');
            itemsStr = parts.slice(firstItemWordIndex).join(' ');
        }

        if (!itemsStr.trim()) return null;
        const itemParts = itemsStr.trim().split(/\s+/).filter(p => p);
        let currentItemNameParts: string[] = [];

        for (let i = 0; i < itemParts.length; i++) {
            const part = itemParts[i];
            const isQty = !isNaN(parseInt(part, 10)) && Number.isInteger(parseFloat(part));

            if (isQty && currentItemNameParts.length > 0) {
                items.push({ code: currentItemNameParts.join(' '), qty: parseInt(part, 10) });
                currentItemNameParts = [];
            } else if (!isQty) {
                currentItemNameParts.push(part);
            }
        }
        return (customerName && items.length > 0) ? { customerName, items } : null;
    };

    const formatOrder = (text: string, options: FormatOptions) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const poDateLine = lines.find(line => line.toLowerCase().includes('tgl p.o'));
        const priceLine = lines.find(line => line.toLowerCase().includes('harga'));
        const nbLine = lines.find(line => /^nb\s*:/i.test(line.trim()));

        if (!poDateLine || !priceLine) throw new Error("Metadata PO / Harga tidak terdeteksi.");

        const poDateMatch = poDateLine.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (!poDateMatch) throw new Error("Format tanggal PO tidak valid (dd/mm/yy).");

        const poDay = poDateMatch[1];
        const poMonth = poDateMatch[2];
        const poYear = poDateMatch[3].slice(-2);
        const poDateFinal = `${poDay}/${poMonth}/${poYear}`;

        const priceMatch = priceLine.match(/(\d{1,3}(?:\.\d{3})*)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/\./g, '')) : 0;

        const hdMatch = priceLine.match(/hd\s*(\d+)rb/i);
        const handlingFee = hdMatch ? parseInt(hdMatch[1]) * 1000 : 0;

        const trMatch = priceLine.match(/tr\s*(\d+)rb/i);
        const transportFee = trMatch ? parseInt(trMatch[1]) * 1000 : 0;

        const lowerCaseInput = text.toLowerCase();
        let deliveryMethod = 'Kirim';
        if (lowerCaseInput.includes('ambil')) deliveryMethod = 'Ambil';

        const fusoMatch = lowerCaseInput.match(/fuso(?:\s+([^\s\n]+))?/i);
        if (fusoMatch) {
            const expeditionName = fusoMatch[1] ? fusoMatch[1].toUpperCase() : '';
            deliveryMethod = 'Muat Fuso' + (expeditionName ? ' ' + expeditionName : '');
        }

        const tarikMatch = lowerCaseInput.match(/tarik(?:\s+([^\s\n]+))?/i);
        if (tarikMatch) {
            const expeditionName = tarikMatch[1] ? tarikMatch[1].toUpperCase() : '';
            deliveryMethod = 'Tarik Kontainer' + (expeditionName ? ' ' + expeditionName : '');
        }

        let truckingInfo = '';
        const truckingMatch = lowerCaseInput.match(/trucking\s+([^\n]+)/i);
        if (truckingMatch && truckingMatch[1]) truckingInfo = `(trucking ${truckingMatch[1].trim()})`;

        let deliveryTime = 'Malam Jam 6';
        if (lowerCaseInput.includes('pagi')) deliveryTime = 'Pagi Jam 8';
        else if (lowerCaseInput.includes('siang')) deliveryTime = 'Siang Jam 1';
        else if (lowerCaseInput.includes('sore')) deliveryTime = 'Sore Jam 4';
        else if (lowerCaseInput.includes('malam')) deliveryTime = 'Malam Jam 9';

        let currentDay = '', currentDate = '';
        const allParsedOrders = [];

        for (const line of lines) {
            const dayMatch = line.match(/^(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
            if (dayMatch) {
                currentDay = dayMatch[1];
                const d = dayMatch[2], m = dayMatch[3], y = dayMatch[4].slice(-2);
                currentDate = `${d}/${m}/${y}`;
                continue;
            }
            const orderDetails = parseOrderLine(line);
            if (orderDetails) {
                if (!currentDate) throw new Error(`Order "${line}" tidak berada di bawah blok tanggal valid.`);
                allParsedOrders.push({ ...orderDetails, deliveryDay: currentDay, deliveryDate: currentDate });
            }
        }

        if (allParsedOrders.length === 0) return "PROSES DIHENTIKAN: TIDAK ADA DATA ORDER YANG VALID.";

        let grandTotalPrice = 0, grandTotalHandling = 0, grandTotalTransport = 0;
        const totalTruk = allParsedOrders.length;

        let finalResult = "";
        for (let i = 0; i < allParsedOrders.length; i++) {
            const order = allParsedOrders[i];
            if (i > 0) finalResult += (order.deliveryDate !== allParsedOrders[i - 1].deliveryDate) ? '\n____________________\n\n' : '\n\n';

            const totalDus = order.items.reduce((sum: number, item: OrderItem) => sum + item.qty, 0);
            const totalPrice = totalDus * price;
            const totalHandling = totalDus * handlingFee;
            const totalTransport = totalDus * transportFee;

            grandTotalPrice += totalPrice;
            grandTotalHandling += totalHandling;
            grandTotalTransport += totalTransport;

            const ppnTag = " *ppn*";
            let orderOutput = `${poDateFinal} ${order.customerName}${ppnTag}\n`;

            order.items.forEach((item: OrderItem) => {
                orderOutput += `${item.code} ${item.qty} dus`;
                if (options.showHarga) orderOutput += ` ${price.toLocaleString('id-ID')}`;
                if (options.showHD && handlingFee > 0) orderOutput += ` + HD ${handlingFee / 1000}rb`;
                if (options.showHD && transportFee > 0) orderOutput += ` + TR ${transportFee / 1000}rb`;
                orderOutput += `\n`;
            });

            orderOutput += (order.items.length > 1)
                ? `Total ${totalDus} dus, ${deliveryMethod} ${order.deliveryDay} ${order.deliveryDate} ${deliveryTime}\n`
                : `${deliveryMethod} ${order.deliveryDay} ${order.deliveryDate} ${deliveryTime}\n`;

            if (truckingInfo) orderOutput += `${truckingInfo}\n`;
            if (options.showPPN) orderOutput += `*Total Produk ${formatCurrency(totalPrice)}*\n`;

            const handlingOutput: string[] = [];
            if (options.showHandlingTotal && handlingFee > 0) handlingOutput.push(`*Total Handling ${formatCurrency(totalHandling)}*`);
            if (options.showHandlingTotal && transportFee > 0) handlingOutput.push(`*Total Transportasi ${formatCurrency(totalTransport)}*`);
            orderOutput += handlingOutput.join('\n');

            finalResult += orderOutput.trimEnd();
        }

        if (nbLine && options.showNB !== false) {
            finalResult += `\n\n\n${nbLine.trim()}`;
        }

        if (options.appendBankInfo || options.appendHDBankInfo || options.appendPPNBankInfo) {
            finalResult += `\n\n____________________`;
        }

        if (options.appendBankInfo && transportFee > 0) {
            finalResult += `\n\n*Total Transportasi ${totalTruk} truk ${formatCurrency(grandTotalTransport)}*`;
            finalResult += `\nPembayaran Transportasi (TR) melalui rekening berikut. \n\nBank BCA\na/c 018-990-0068\na/n CV. Oil and Supply Expedition`;
            if (options.appendHDBankInfo && handlingFee > 0) finalResult += `\n\n____________________`;
        }

        if (options.appendHDBankInfo && handlingFee > 0) {
            finalResult += `\n\n*Total Handling ${totalTruk} truk ${formatCurrency(grandTotalHandling)}*`;
            finalResult += `\nPembayaran Handling (HD) melalui rekening berikut :\n\n1. Bank BCA\na/c 018-225-0871\na/n CV. Makmur abadi Palmindo`;
        }

        if (options.appendPPNBankInfo) {
            finalResult += `\n\n*Total ${totalTruk} truk ${formatCurrency(grandTotalPrice)}*`;
            finalResult += `\nPembayaran bisa melalui rekening berikut :\n\n1. Bank BCA\na/c 018-225-0871\na/n CV. Makmur abadi Palmindo\n\n2. Bank BRI\na/c 0211-0100-2157-307\na/n CV. Makmur Abadi Palmindo\n\n3. Bank Mandiri\na/c 14200-2000-8958\na/n CV. Makmur Abadi Palmindo\n\n4. Bank BNI\na/c 2100-2222-33\na/n CV. Makmur Abadi Palmindo`;
        }

        return finalResult;
    };

    const handleCompile = () => {
        if (!inputText.trim()) {
            const errorMsg = 'SILAKAN MASUKKAN DATA ORDER TERLEBIH DAHULU.';
            setOutputs({ lengkap: errorMsg, plain: errorMsg, noHd: errorMsg, handlingOnly: errorMsg });
            return;
        }

        try {
            setOutputs({
                lengkap: formatOrder(inputText, { showHarga: true, showHD: true, showPPN: true, showHandlingTotal: true, showNB: true }),
                plain: formatOrder(inputText, { showHarga: false, showHD: false, showPPN: false, showHandlingTotal: false, showNB: true }),
                noHd: formatOrder(inputText, { showHarga: true, showHD: false, showPPN: true, showNB: true, showHandlingTotal: false, appendPPNBankInfo: true }),
                handlingOnly: formatOrder(inputText, { showHarga: false, showHD: true, showPPN: false, showHandlingTotal: true, showNB: true, appendBankInfo: true, appendHDBankInfo: true })
            });
        } catch (error: unknown) {
            let errorMessage = "ERR: SYNTAX_FAILED.";
            if (error instanceof Error) {
                errorMessage += `\nDETAIL: ${error.message.toUpperCase()}`;
            }
            setOutputs({ lengkap: errorMessage, plain: errorMessage, noHd: errorMessage, handlingOnly: errorMessage });
        }
    };

    const handlePurge = () => {
        setInputText('');
        setOutputs({ lengkap: '', plain: '', noHd: '', handlingOnly: '' });
    };

    const copyToClipboard = (text: string, formatName: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showNotification(`TEKS "${formatName}" BERHASIL DISALIN!`, false);
        }).catch(() => {
            showNotification('GAGAL MENYALIN DATA SYSTEM', true);
        });
    };

    const showNotification = (message: string, isError: boolean) => {
        if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
        setNotification({ visible: true, message, isError });

        notifTimeoutRef.current = setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
        }, 1500);
    };

    useEffect(() => {
        return () => {
            if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
        };
    }, []);

    return (
        <div className="min-h-screen text-white py-8 selection:bg-[#00D4FF]/30 pb-20" style={{ backgroundColor: '#0A0A0A' }}>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Sixtyfour+Convergence&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        body {
            font-family: 'Share Tech Mono', monospace;
            background-color: #0A0A0A;
            background-image: 
                radial-gradient(at 0% 0%, rgba(0, 212, 255, 0.05) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(0, 212, 255, 0.03) 0px, transparent 50%);
            color: #FFFFFF;
        }
        
        .font-sixtyfour {
            font-family: 'Sixtyfour Convergence', sans-serif;
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }

        .font-mono-tech {
            font-family: 'Share Tech Mono', monospace;
        }

        .neon-glow-accent {
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.25);
        }
        
        .neon-glow-hover:hover {
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
            border-color: #00D4FF;
        }

        .neon-glow-red-hover:hover {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
            border-color: #EF4444;
        }

        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #0A0A0A;
        }
        ::-webkit-scrollbar-thumb {
            background: #151515;
            border: 1px solid rgba(0, 212, 255, 0.3);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #00D4FF;
        }
      `}</style>

            {/* Tombol Kembali ke Menu */}
            <div className="max-w-5xl mx-auto mb-6 px-6">
                <Link to="/" className="text-[#A0A0A0] hover:text-[#00D4FF] transition-colors inline-flex items-center gap-2 font-mono-tech text-sm tracking-widest bg-black/40 px-4 py-2 rounded-lg border border-white/10 hover:border-[#00D4FF]/50">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    KEMBALI KE MENU
                </Link>
            </div>

            {/* Tombol Toggle Ukuran */}
            <div className="flex justify-center items-center gap-4 mb-6">
                <button
                    onClick={() => setIsMobileView(true)}
                    className={`p-3 rounded-xl border transition-all duration-300 ease-out flex items-center justify-center ${isMobileView ? 'border-[#00D4FF]/30 bg-[#151515]/80 text-[#00D4FF] neon-glow-accent' : 'border-white/5 bg-[#151515]/50 text-white/50 hover:border-white/20 hover:text-white'}`}
                    title="Ukuran Mobile"
                >
                    <span className="material-symbols-outlined block">smartphone</span>
                </button>
                <button
                    onClick={() => setIsMobileView(false)}
                    className={`p-3 rounded-xl border transition-all duration-300 ease-out flex items-center justify-center ${!isMobileView ? 'border-[#00D4FF]/30 bg-[#151515]/80 text-[#00D4FF] neon-glow-accent' : 'border-white/5 bg-[#151515]/50 text-white/50 hover:border-white/20 hover:text-white'}`}
                    title="Ukuran Laptop"
                >
                    <span className="material-symbols-outlined block">laptop_chromebook</span>
                </button>
            </div>

            <div className={`mx-auto p-6 bg-[#151515]/70 backdrop-blur-md border border-white/5 shadow-2xl rounded-2xl transition-all duration-500 ease-out ${isMobileView ? 'max-w-[360px]' : 'max-w-5xl'}`}>
                <header className="text-left mb-8 border-b border-white/5 pb-6">
                    <h1 className="text-xl font-sixtyfour text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00D4FF] mb-2 leading-relaxed tracking-wider">Order MAP PPN</h1>
                    <p className="text-xs uppercase tracking-widest text-[#00D4FF] mb-4">SYSTEM TERMINAL</p>
                    <div className="text-xs text-white/60 bg-black/40 border border-white/5 p-4 rounded-xl leading-relaxed text-justify uppercase tracking-wider font-mono-tech">
                        Version 3.0
                    </div>
                </header>

                {/* Input Section */}
                <div className="bg-black/30 border border-white/5 p-5 rounded-xl mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full inline-block animate-pulse"></span>
                        <h2 className="text-xs uppercase tracking-widest text-white/70 font-semibold font-mono-tech">01 // SOURCE_DATA</h2>
                    </div>

                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="w-full h-56 p-4 bg-black/40 border border-white/5 rounded-lg text-white font-mono-tech text-sm focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] focus:shadow-[0_0_10px_rgba(0,212,255,0.15)] transition-all duration-300 placeholder-white/30"
                        placeholder="tgl p.o 14/6/25&#10;Senin 16/6/25&#10;Pelanggan 1, B1lt 100&#10;Harga 174.000 + TR 5rb&#10;NB : ..."
                    ></textarea>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <button onClick={handleCompile} className="w-full py-3 px-4 border border-[#00D4FF]/30 bg-black/50 text-[#00D4FF] rounded-lg font-mono-tech text-xs uppercase tracking-widest hover:bg-[#00D4FF] hover:text-black transition-all duration-300 ease-out transform hover:scale-[1.03] active:scale-95 flex justify-center items-center gap-2 neon-glow-hover">
                            <span className="material-symbols-outlined text-lg">play_arrow</span>
                            <span>COMPILE</span>
                        </button>
                        <button onClick={handlePurge} className="w-full py-3 px-4 border border-red-500/20 bg-black/50 text-red-500 rounded-lg font-mono-tech text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-300 ease-out transform hover:scale-[1.03] active:scale-95 flex justify-center items-center gap-2 neon-glow-red-hover">
                            <span className="material-symbols-outlined text-lg">delete</span>
                            <span>PURGE</span>
                        </button>
                    </div>
                </div>

                {/* Output Grid */}
                <div className="flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full inline-block animate-pulse"></span>
                    <h2 className="text-xs uppercase tracking-widest text-white/70 font-semibold font-mono-tech">02 // OUTPUT_GENERATOR</h2>
                </div>

                <div className={`grid gap-6 ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'}`}>

                    {/* Format Lengkap */}
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl transition-all duration-300 hover:border-white/10">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                            <h3 className="text-xs font-semibold tracking-widest text-[#00D4FF] font-mono-tech uppercase">/// ORDER HARGA (COMPREHENSIVE)</h3>
                            <button onClick={() => copyToClipboard(outputs.lengkap, 'ORDER HARGA')} className="p-1.5 rounded-md text-white/40 border border-white/5 bg-black/40 hover:text-[#00D4FF] hover:border-[#00D4FF]/50 hover:shadow-[0_0_8px_rgba(0,212,255,0.2)] transition-all duration-300" title="Salin">
                                <span className="material-symbols-outlined text-sm block">content_copy</span>
                            </button>
                        </div>
                        <textarea value={outputs.lengkap} readOnly className="w-full h-44 p-3 bg-black/40 border border-white/5 rounded-lg text-white/80 text-xs font-mono-tech focus:outline-none"></textarea>
                    </div>

                    {/* Format Polos */}
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl transition-all duration-300 hover:border-white/10">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                            <h3 className="text-xs font-semibold tracking-widest text-white/60 font-mono-tech uppercase">/// ORDER (PLAIN)</h3>
                            <button onClick={() => copyToClipboard(outputs.plain, 'ORDER PLAIN')} className="p-1.5 rounded-md text-white/40 border border-white/5 bg-black/40 hover:text-[#00D4FF] hover:border-[#00D4FF]/50 hover:shadow-[0_0_8px_rgba(0,212,255,0.2)] transition-all duration-300" title="Salin">
                                <span className="material-symbols-outlined text-sm block">content_copy</span>
                            </button>
                        </div>
                        <textarea value={outputs.plain} readOnly className="w-full h-44 p-3 bg-black/40 border border-white/5 rounded-lg text-white/80 text-xs font-mono-tech focus:outline-none"></textarea>
                    </div>

                    {/* Format PPN */}
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl transition-all duration-300 hover:border-white/10">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                            <h3 className="text-xs font-semibold tracking-widest text-[#00D4FF] font-mono-tech uppercase">/// ORDER PPN</h3>
                            <button onClick={() => copyToClipboard(outputs.noHd, 'ORDER PPN')} className="p-1.5 rounded-md text-white/40 border border-white/5 bg-black/40 hover:text-[#00D4FF] hover:border-[#00D4FF]/50 hover:shadow-[0_0_8px_rgba(0,212,255,0.2)] transition-all duration-300" title="Salin">
                                <span className="material-symbols-outlined text-sm block">content_copy</span>
                            </button>
                        </div>
                        <textarea value={outputs.noHd} readOnly className="w-full h-44 p-3 bg-black/40 border border-white/5 rounded-lg text-white/80 text-xs font-mono-tech focus:outline-none"></textarea>
                    </div>

                    {/* Format HD & TR */}
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl transition-all duration-300 hover:border-white/10">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                            <h3 className="text-xs font-semibold tracking-widest text-purple-400 font-mono-tech uppercase">/// ORDER HD & TR</h3>
                            <button onClick={() => copyToClipboard(outputs.handlingOnly, 'ORDER HD & TR')} className="p-1.5 rounded-md text-white/40 border border-white/5 bg-black/40 hover:text-[#00D4FF] hover:border-[#00D4FF]/50 hover:shadow-[0_0_8px_rgba(0,212,255,0.2)] transition-all duration-300" title="Salin">
                                <span className="material-symbols-outlined text-sm block">content_copy</span>
                            </button>
                        </div>
                        <textarea value={outputs.handlingOnly} readOnly className="w-full h-44 p-3 bg-black/40 border border-white/5 rounded-lg text-white/80 text-xs font-mono-tech focus:outline-none"></textarea>
                    </div>

                </div>
            </div>

            {/* Notifikasi Toast */}
            <div
                className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-xs text-center py-4 px-6 rounded-xl transition-all duration-300 transform font-mono-tech text-xs uppercase tracking-wider z-[9999] backdrop-blur-md 
        ${notification.visible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'} 
        ${notification.isError ? 'bg-black/95 border border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)]' : 'bg-black/95 border border-[#00D4FF] text-[#00D4FF] shadow-[0_0_25px_rgba(0,212,255,0.5)]'}`}
            >
                {notification.message}
            </div>
        </div>
    );
}