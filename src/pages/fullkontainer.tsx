import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';

interface Item {
    name: string;
    capacity: number;
}

interface Category {
    category: string;
    items: Item[];
}

const PRODUCT_DATA: Category[] = [
    {
        category: "Botol", items: [
            { name: "Botol 220 ml", capacity: 1703 }, { name: "Botol 250 ml", capacity: 1559 },
            { name: "Botol 400 ml", capacity: 1672 }, { name: "Botol 500 ml", capacity: 1672 },
            { name: "Botol 560 ml", capacity: 1417 }, { name: "Botol 600 ml", capacity: 1315 },
            { name: "Botol 700 ml", capacity: 1801 }, { name: "Botol 800 ml", capacity: 1576 },
            { name: "Botol 820 ml", capacity: 1888 }, { name: "Botol 850 ml", capacity: 1888 },
            { name: "Botol 900 ml", capacity: 1888 }, { name: "Botol 1000 ml", capacity: 1576 }
        ]
    },
    {
        category: "Jerigen", items: [
            { name: "Jerigen 800 ml", capacity: 1763 }, { name: "Jerigen 900 ml", capacity: 1763 },
            { name: "Jerigen 1000 ml", capacity: 1559 }, { name: "Jerigen 1700 ml", capacity: 1597 },
            { name: "Jerigen 1800 ml", capacity: 1597 }, { name: "Jerigen 2000 ml", capacity: 1597 },
            { name: "Jerigen 4400 ml", capacity: 1119 }, { name: "Jerigen 4500 ml", capacity: 1119 },
            { name: "Jerigen 4800 ml", capacity: 1077 }, { name: "Jerigen 5000 ml", capacity: 1077 },
            { name: "Jerigen 18000 ml", capacity: 1250 }, { name: "Jerigen 20000 ml", capacity: 1307 }
        ]
    },
    {
        category: "Refil", items: [
            { name: "Refil 400 ml", capacity: 2171 }, { name: "Refil 700 ml", capacity: 2000 },
            { name: "Refil 800 ml", capacity: 2000 }, { name: "Refil 900 ml", capacity: 1896 },
            { name: "Refil 1000 ml", capacity: 1754 }, { name: "Refil 1800 ml", capacity: 1754 },
            { name: "Refil 2000 ml", capacity: 1754 }
        ]
    },
    { category: "Cup", items: [{ name: "Cup 180 ml", capacity: 1920 }] }
];

export default function FullKontainer() {
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    const updateQuantity = (name: string, val: string) => {
        setQuantities(prev => ({ ...prev, [name]: Math.max(0, parseInt(val) || 0) }));
    };

    const resetAll = () => setQuantities({});

    // Hitung total di sini (sebelum return)
    let totalQty = 0;
    let totalPerc = 0;

    PRODUCT_DATA.forEach(cat => {
        cat.items.forEach(item => {
            const q = quantities[item.name] || 0;
            if (q > 0) {
                totalQty += q;
                totalPerc += (q / item.capacity) * 100;
            }
        });
    });

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 font-mono">
            <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

            <div className="max-w-4xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-[#00D4FF] mb-6 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span> KEMBALI KE MENU
                </Link>

                <div className="bg-[#151515]/70 backdrop-blur-md border border-white/5 p-6 rounded-2xl mb-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-xl md:text-2xl font-bold tracking-widest text-[#00D4FF]">FULL KONTAINER</h1>
                        <button onClick={resetAll} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all">
                            <span className="material-symbols-outlined">refresh</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs md:text-sm">
                            <thead className="text-[#00D4FF] border-b border-white/10">
                                <tr>
                                    <th className="py-3">Nama</th>
                                    <th className="py-3">Q (Dus)</th>
                                    <th className="py-3">Kapasitas</th>
                                    <th className="py-3">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PRODUCT_DATA.map(cat => (
                                    <Fragment key={cat.category}>
                                        <tr>
                                            <td colSpan={4} className="py-4 font-bold text-[#00D4FF]/50">{cat.category}</td>
                                        </tr>
                                        {cat.items.map(item => {
                                            const q = quantities[item.name] || 0;
                                            const perc = item.capacity ? (q / item.capacity) * 100 : 0;
                                            return (
                                                <tr key={item.name} className="border-b border-white/5">
                                                    <td className="py-3">{item.name}</td>
                                                    <td className="py-3">
                                                        <input
                                                            type="number"
                                                            className="w-20 bg-transparent text-white border border-white/5 rounded px-2 py-1"
                                                            value={q || ''}
                                                            onChange={(e) => updateQuantity(item.name, e.target.value)}
                                                            min={0}
                                                        />
                                                    </td>
                                                    <td className="py-3">{item.capacity.toLocaleString('id-ID')}</td>
                                                    <td className="py-3">{perc.toFixed(2)}%</td>
                                                </tr>
                                            );
                                        })}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 p-4 bg-[#00D4FF]/5 rounded-xl border border-[#00D4FF]/20 flex flex-col md:flex-row justify-between gap-2 font-bold text-[#00D4FF]">
                        <span>TOTAL DUS: {totalQty.toLocaleString('id-ID')} Dus</span>
                        <span>KAPASITAS: {totalPerc.toFixed(2)}% </span>
                    </div>
                </div>
            </div>
        </div>
    );
}