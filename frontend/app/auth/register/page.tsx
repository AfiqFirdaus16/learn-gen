'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api-config';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        nama: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Registrasi gagal');
                return;
            }

            setSuccess('Registrasi berhasil! Silakan login.');
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
        } catch (err) {
            setError('Terjadi kesalahan. Silakan coba lagi.');
            console.error('Register error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f1f5f9] p-4 sm:p-8">
            <section className="relative flex w-full max-w-[1080px] flex-col overflow-hidden bg-[#123b78] shadow-[0_28px_80px_-30px_rgba(12,38,78,0.42)] lg:min-h-[760px] lg:flex-row">
                <div className="relative z-10 flex min-h-[290px] w-full items-center justify-center bg-white px-8 py-12 text-center sm:min-h-[340px] lg:absolute lg:inset-y-0 lg:left-0 lg:min-h-0 lg:w-[56%] lg:[clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">
                    <div className="max-w-sm">
                        <div className="mx-auto mb-7 flex h-[142px] w-[176px] items-center justify-center">
                            <svg viewBox="0 0 220 180" role="img" aria-label="Ilustrasi seseorang sedang belajar" className="h-full w-full">
                                <path d="M27 150h166" stroke="#d9e6f5" strokeWidth="3" strokeLinecap="round" />
                                <path d="M42 72c0-4 3-7 7-7h56v63H49c-4 0-7 3-7 7V72Z" fill="#dcecff" stroke="#2b5c9d" strokeWidth="3" strokeLinejoin="round" />
                                <path d="M178 72c0-4-3-7-7-7h-56v63h56c4 0 7 3 7 7V72Z" fill="#edf5ff" stroke="#2b5c9d" strokeWidth="3" strokeLinejoin="round" />
                                <path d="M110 65v63" stroke="#2b5c9d" strokeWidth="3" />
                                <path d="M64 84h26m-26 12h30m42-12h26m-26 12h30" stroke="#8fb5e2" strokeWidth="3" strokeLinecap="round" />
                                <path d="M103 39c0-13 10-23 23-23s23 10 23 23v8h-46v-8Z" fill="#f0b58e" />
                                <path d="M101 39c0-15 10-25 25-25 11 0 19 6 22 15-7-4-14-5-20-3-6 8-14 12-27 13Z" fill="#203d65" />
                                <path d="M107 49c4 6 10 9 17 9s13-3 17-9v-6h-34v6Z" fill="#f0b58e" />
                                <path d="M97 97c2-18 15-29 28-29s26 11 28 29l6 34H91l6-34Z" fill="#4b8bd3" />
                                <path d="M105 74 88 87l12 17m43-30 17 13-12 17" fill="none" stroke="#f0b58e" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M104 131v18m40-18v18" stroke="#203d65" strokeWidth="8" strokeLinecap="round" />
                                <path d="m176 31 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8Z" fill="#ffc857" />
                                <circle cx="52" cy="39" r="5" fill="#ffc857" />
                            </svg>
                        </div>
                        <h1 className="text-[2rem] font-extrabold tracking-[0.12em] text-[#123b78] sm:text-4xl">LEARN GEN</h1>
                        <p className="mt-3 text-base text-slate-600">Mulai perjalanan belajarmu</p>
                        <div className="mx-auto mt-7 h-1 w-12 bg-[#70b5f4]" />
                    </div>
                </div>

                <div className="relative z-0 flex w-full flex-1 items-center justify-center px-7 py-10 text-white sm:px-12 sm:py-14 lg:ml-auto lg:w-[47%] lg:flex-none lg:px-8 lg:py-12">
                    <div className="w-full max-w-[365px]">
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#91c9ff]">Create your account</p>
                        <h2 className="mb-6 text-3xl font-bold">Join Learn Gen</h2>

                        {error && (
                            <div role="alert" className="mb-4 border border-red-200/40 bg-red-950/30 px-4 py-3 text-sm text-red-100">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div role="status" className="mb-4 border border-emerald-200/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="nama" className="block text-sm font-semibold text-white">Nama Lengkap</label>
                                <input
                                    id="nama"
                                    type="text"
                                    placeholder="Nama Anda"
                                    name="nama"
                                    value={formData.nama}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isLoading}
                                    autoComplete="name"
                                    className="h-12 w-full border border-white/70 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#83c4ff] focus:ring-2 focus:ring-[#83c4ff]/40 disabled:opacity-70"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-semibold text-white">Your email</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isLoading}
                                    autoComplete="email"
                                    className="h-12 w-full border border-white/70 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#83c4ff] focus:ring-2 focus:ring-[#83c4ff]/40 disabled:opacity-70"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-white">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="Minimal 6 karakter"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                    className="h-12 w-full border border-white/70 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#83c4ff] focus:ring-2 focus:ring-[#83c4ff]/40 disabled:opacity-70"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white">Konfirmasi Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Ulangi password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                    className="h-12 w-full border border-white/70 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#83c4ff] focus:ring-2 focus:ring-[#83c4ff]/40 disabled:opacity-70"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-2 flex h-12 w-full items-center justify-center bg-[#70b5f4] px-5 text-sm font-extrabold tracking-[0.14em] text-[#102f58] transition-colors hover:bg-[#91ccff] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                            </button>
                        </form>

                        <div className="my-5 flex items-center gap-4 text-[11px] uppercase tracking-[0.14em] text-white/55">
                            <span className="h-px flex-1 bg-white/20" />
                            Already a member?
                            <span className="h-px flex-1 bg-white/20" />
                        </div>

                        <Link
                            href="/auth/login"
                            className="flex h-12 w-full items-center justify-center border border-white/80 bg-white px-5 text-sm font-extrabold tracking-[0.14em] text-[#123b78] transition-colors hover:bg-[#e8f3ff]"
                        >
                            SIGN IN
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
