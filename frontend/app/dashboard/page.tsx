'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Admin {
    id: number;
    nama: string;
    email: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const adminData = localStorage.getItem('admin');

            if (!token || !adminData) {
                router.push('/auth/login');
                return;
            }

            try {
                setAdmin(JSON.parse(adminData));
            } catch (error) {
                router.push('/auth/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        router.push('/auth/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 shadow-md border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">📚</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Learn-Gen</h1>
                            <p className="text-xs text-muted-foreground">Video Pembelajaran AI</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="font-semibold text-sm">{admin?.nama}</p>
                            <p className="text-xs text-muted-foreground">{admin?.email}</p>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="border-2"
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">Selamat datang, {admin?.nama}! 👋</h2>
                    <p className="text-muted-foreground">
                        Mari kita mulai membuat video pembelajaran AI yang luar biasa.
                    </p>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create Video Card */}
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">🎬</span> Buat Video
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Mulai membuat video pembelajaran dengan mengisi formulir pembelajaran Anda.
                            </p>
                            <Link href="/dashboard/create-video">
                                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                                    Buat Video Baru
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* My Videos Card */}
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">📹</span> Video Saya
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Lihat semua video pembelajaran yang telah Anda buat.
                            </p>
                            <Link href="/dashboard/my-videos">
                                <Button variant="outline" className="w-full border-2">
                                    Lihat Video
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Personas Card */}
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">🧑‍🏫</span> Persona
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Buat profil pembelajar beserta gaya belajar, avatar, dan suara untuk video Anda.
                            </p>
                            <Link href="/dashboard/personas">
                                <Button variant="outline" className="w-full border-2">Kelola Persona</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Settings Card */}
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">⚙️</span> Pengaturan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Kelola pengaturan akun dan preferensi Anda.
                            </p>
                            <Link href="/dashboard/settings">
                                <Button variant="outline" className="w-full border-2">
                                    Buka Pengaturan
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                Total Video
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">0</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                Sedang Diproses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">0</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                Selesai
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">0</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
