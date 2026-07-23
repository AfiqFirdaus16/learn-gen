import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-10 dark:bg-zinc-950">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Learn-Gen Video AI</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col space-y-6">
          
          {/* Input Topik */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="topik" className="text-sm font-semibold">Topik Pembelajaran</Label>
            <Input id="topik" placeholder="Contoh: Algoritma Sorting..." className="p-3" />
          </div>

          {/* Tombol Submit */}
          <Button className="w-full py-6 text-lg font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
            Generate Video
          </Button>
          
        </CardContent>
      </Card>
    </main>
  )
}