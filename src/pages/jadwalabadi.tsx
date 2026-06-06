import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Fungsi formatter dipisah dari komponen
function formatScheduleData(inputText: string): string {
    if (!inputText.trim()) return '';

    const lines = inputText.split('\n');
    let result = '*JADWAL KIRIM*';
    let pendingDateHeader = '';
    let pendingTimeHeader = '';
    let timeEntries: string[] = [];

    let isFirstTimeInDate = true;

    function flushTimeEntries() {
        if (timeEntries.length > 0 && pendingTimeHeader) {
            if (pendingDateHeader) {
                result += '\n\n';
                result += pendingDateHeader + '\n';
                pendingDateHeader = '';
                isFirstTimeInDate = true;
            }
            if (!isFirstTimeInDate) {
                result += '\n';
            }
            result += pendingTimeHeader + '\n';
            isFirstTimeInDate = false;
            timeEntries.forEach(entry => {
                result += entry + '\n';
            });
            timeEntries = [];
        }
        pendingTimeHeader = '';
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) continue;
        if (line === '*JADWAL KIRIM*') continue;

        const dateMatch = line.match(/^\*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\*$/);
        if (dateMatch) {
            flushTimeEntries();
            const dayInfo = dateMatch[2];
            pendingDateHeader = `*${dateMatch[1]} ${dayInfo}*`;
            continue;
        }

        const timeMatch = line.match(/^(Pagi|Siang|Malam)\s+jam\s+\d+:?$/i);
        if (timeMatch) {
            flushTimeEntries();
            pendingTimeHeader = line;
            continue;
        }

        if (line.startsWith('•') || line.startsWith('*') || line.startsWith('-')) {
            const entryText = line.replace(/^[•*\-⁠\s]+/, '').trim();

            if (entryText.toLowerCase().includes('abadi')) {
                let cleanedEntry = entryText;

                cleanedEntry = cleanedEntry.replace(/\s*abadi\.?\s*$/i, '');
                cleanedEntry = cleanedEntry.replace(/\s+abadi\s+/gi, ' ');
                cleanedEntry = cleanedEntry.replace(/\s*abadi\s*/gi, ' ');
                cleanedEntry = cleanedEntry.replace(/\s+/g, ' ').trim();
                cleanedEntry = cleanedEntry.replace(/\.+$/, '');

                const formattedEntry = '• ' + cleanedEntry + '.';
                timeEntries.push(formattedEntry);
            }
        }
    }

    flushTimeEntries();
    return result.trim();
}

export default function JadwalAbadi() {
    const [inputData, setInputData] = useState<string>('');
    const [outputData, setOutputData] = useState<string>('');
    const [formatStatus, setFormatStatus] = useState<'idle' | 'success' | 'empty'>('idle');

    const [toastMessage, setToastMessage] = useState<string>('');
    const [showToast, setShowToast] = useState<boolean>(false);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerToast = (message: string) => {
        setToastMessage(message);
        setShowToast(true);

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);

        toastTimeoutRef.current = setTimeout(() => {
            setShowToast(false);
        }, 2000); // Dipercepat sedikit jadi 2 detik agar tidak terlalu lama menutupi layar
    };

    const handleFormat = () => {
        if (!inputData.trim()) {
            triggerToast('DATA KOSONG. MASUKKAN INPUT.');
            return;
        }

        const output = formatScheduleData(inputData);
        if (output && output !== '*JADWAL KIRIM*') {
            setOutputData(output);
            setFormatStatus('success');
            triggerToast('DATA BERHASIL DIFORMAT.');
        } else {
            setOutputData('');
            setFormatStatus('empty');
        }
    };

    const handleClear = () => {
        setInputData('');
        setOutputData('');
        setFormatStatus('idle');
    };

    const handleCopy = async () => {
        if (formatStatus === 'success' && outputData) {
            try {
                await navigator.clipboard.writeText(outputData);
                triggerToast('DISALIN KE CLIPBOARD!');
            } catch {
                const textArea = document.createElement('textarea');
                textArea.value = outputData;
                document.body.appendChild(textArea);
                textArea.select();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (document as any).execCommand('copy');

                document.body.removeChild(textArea);
                triggerToast('DISALIN KE CLIPBOARD!');
            }
        } else {
            triggerToast('TIDAK ADA DATA UNTUK DISALIN.');
        }
    };

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, []);

    return (
        <div className="relative w-screen min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#00D4FF]/30 overflow-x-hidden">

            {/* Impor Font & Custom Scrollbar */}
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Sixtyfour+Convergence&display=swap');
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(21, 21, 21, 0.8);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 212, 255, 0.3);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 212, 255, 0.6);
                }
                `}
            </style>

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D4FF] opacity-[0.03] blur-[120px] rounded-full"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#151515]/50 to-[#0A0A0A]"></div>
            </div>

            {/* Konten Utama */}
            <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col">

                {/* Header */}
                <div className="relative flex flex-col md:flex-row items-center justify-center mb-10 gap-4 w-full">
                    <div className="w-full md:absolute md:left-0 md:w-auto flex justify-start z-10">
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#151515]/70 backdrop-blur-sm border border-white/5 text-[#A0A0A0] hover:bg-[#151515] hover:border-white/20 hover:text-white rounded-xl transition-all duration-300 group"
                        >
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            <span style={{ fontFamily: '"Share Tech Mono", monospace' }} className="mt-1 tracking-widest uppercase text-sm">
                                KEMBALI
                            </span>
                        </Link>
                    </div>

                    <h1
                        style={{ fontFamily: '"Sixtyfour Convergence", sans-serif' }}
                        className="text-3xl md:text-5xl font-bold tracking-tight opacity-100 drop-shadow-[0_0_20px_rgba(0,212,255,0.4)] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 text-center z-0"
                    >
                        Jadwal Abadi
                    </h1>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">

                    {/* Panel Kiri: Input */}
                    <div className="bg-[#151515]/70 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 bg-[#00D4FF] rounded-full shadow-[0_0_10px_rgba(0,212,255,0.8)] animate-pulse"></div>
                            <h2 style={{ fontFamily: '"Share Tech Mono", monospace' }} className="text-xl text-[#00D4FF] tracking-widest uppercase drop-shadow-[0_0_10px_rgba(0,212,255,0.6)]">
                                RAW DATA
                            </h2>
                        </div>

                        {/* Diubah: min-h diganti jadi tinggi absolut (h-[400px] lg:h-[500px]) agar bisa discroll */}
                        <textarea
                            value={inputData}
                            onChange={(e) => setInputData(e.target.value)}
                            className="w-full h-[400px] lg:h-[500px] bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-[#A0A0A0] focus:text-white focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] outline-none transition-all custom-scrollbar resize-none font-mono text-sm"
                            placeholder="Paste jadwal raw di sini..."
                        ></textarea>

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleFormat}
                                style={{ fontFamily: '"Share Tech Mono", monospace' }}
                                className="flex-1 bg-[#151515] border border-white/10 hover:border-[#00D4FF] hover:text-[#00D4FF] hover:shadow-[0_0_20px_rgba(0,212,255,0.25)] text-[#A0A0A0] py-3 rounded-xl transition-all uppercase tracking-widest text-lg flex items-center justify-center gap-2"
                            >
                                EXECUTE
                            </button>
                            <button
                                onClick={handleClear}
                                style={{ fontFamily: '"Share Tech Mono", monospace' }}
                                className="bg-[#151515] border border-white/10 hover:border-red-500 hover:text-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] text-[#A0A0A0] py-3 px-6 rounded-xl transition-all uppercase tracking-widest text-lg"
                            >
                                WIPE
                            </button>
                        </div>
                    </div>

                    {/* Panel Kanan: Output */}
                    <div className="bg-[#151515]/70 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                                <h2 style={{ fontFamily: '"Share Tech Mono", monospace' }} className="text-xl text-white tracking-widest uppercase">
                                    COMPILED RESULT
                                </h2>
                            </div>
                            <button
                                onClick={handleCopy}
                                style={{ fontFamily: '"Share Tech Mono", monospace' }}
                                className="bg-[#151515] border border-white/10 hover:border-[#00D4FF] hover:text-white hover:bg-[#00D4FF]/10 text-[#A0A0A0] py-1.5 px-4 rounded-lg transition-all uppercase tracking-widest text-sm flex items-center gap-2"
                            >
                                COPY
                            </button>
                        </div>

                        {/* Diubah: min-h diganti jadi tinggi absolut (h-[400px] lg:h-[500px]) agar identik dengan form input */}
                        <div className="w-full h-[400px] lg:h-[500px] bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-white overflow-y-auto custom-scrollbar whitespace-pre-wrap font-mono text-sm leading-relaxed">
                            {formatStatus === 'idle' && (
                                <span className="text-[#A0A0A0] italic">Menunggu input...</span>
                            )}
                            {formatStatus === 'empty' && (
                                <span className="text-red-400/80 italic">Data abadi tidak ditemukan.</span>
                            )}
                            {formatStatus === 'success' && outputData}
                        </div>
                    </div>

                </div>
            </div>

            {/* Toast Notification Cyberpunk Style - DIPINDAHKAN KE TENGAH */}
            <div
                className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#151515]/95 backdrop-blur-sm border-2 border-[#00D4FF] shadow-[0_0_40px_rgba(0,212,255,0.4)] text-white px-8 py-5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-4 z-50 
                ${showToast ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
            >
                <div className="w-3 h-3 bg-[#00D4FF] rounded-full animate-ping"></div>
                <span style={{ fontFamily: '"Share Tech Mono", monospace' }} className="tracking-widest uppercase text-base md:text-lg mt-0.5 text-[#00D4FF] font-bold">
                    {toastMessage}
                </span>
            </div>

        </div>
    );
}