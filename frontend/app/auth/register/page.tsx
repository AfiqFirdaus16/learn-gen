'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-2 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">📚</span>
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold">Learn-Gen</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Buat akun baru untuk memulai
                    </p>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <p className="text-sm text-green-600 dark:text-green-200">{success}</p>
                        </div>
                    )}

                    {/* Register Form */}
                    <form onSubmit={handleRegister} className="space-y-4">
                        {/* Nama Field */}
                        <div className="space-y-2">
                            <Label htmlFor="nama" className="text-sm font-semibold">
                                Nama Lengkap
                            </Label>
                            <Input
                                id="nama"
                                type="text"
                                placeholder="Nama Anda"
                                name="nama"
                                value={formData.nama}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                                className="p-3"
                            />
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="contoh@email.com"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                                className="p-3"
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Minimal 6 karakter"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                                className="p-3"
                            />
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                                Konfirmasi Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Ulangi password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                                className="p-3"
                            />
                        </div>

                        {/* Register Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> Mendaftar...
                                </span>
                            ) : (
                                'Daftar'
                            )}
                        </Button>
                    </form>

                    {/* Login Link */}
                    <p className="text-center text-sm text-muted-foreground">
                        Sudah punya akun?{' '}
                        <Link href="/auth/login" className="text-green-600 hover:text-green-700 font-semibold">
                            Masuk di sini
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
