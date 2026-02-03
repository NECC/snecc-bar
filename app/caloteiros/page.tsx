"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getCaloteiros, type CaloteiroEntry } from "@/lib/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, TrendingDown, History, ArrowLeft } from "lucide-react"

export default function CaloteirosPage() {
  const [byCurrentDebt, setByCurrentDebt] = useState<CaloteiroEntry[]>([])
  const [byLifetimeDebt, setByLifetimeDebt] = useState<CaloteiroEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { byCurrentDebt: current, byLifetimeDebt: lifetime } = await getCaloteiros()
      setByCurrentDebt(current)
      setByLifetimeDebt(lifetime)
      setLoading(false)
    }
    load()
  }, [])

  const formatDebt = (balance: number) =>
    balance <= 0 ? `N${Math.abs(balance).toFixed(2)}` : "—"
  const formatLifetime = (max: number) => (max > 0 ? `N${max.toFixed(2)}` : "—")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex flex-col">
      {/* Header - mesmo estilo da página principal */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-4">
                <img src="/favicon.ico" alt="NECC Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    sNECC-Bar
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Caloteiros</p>
                </div>
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Bar
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-500" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto w-full flex flex-col">
        <main className="flex-1 flex flex-col">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1">
                Ranking dos Caloteiros
              </h2>
              <p className="text-sm text-slate-500">
                Quem deve mais agora e quem já deveu mais de sempre.
              </p>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-slate-500">A carregar...</p>
              </div>
            ) : byCurrentDebt.length === 0 && byLifetimeDebt.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-slate-500">Ainda não há caloteiros. Todos em dia.</p>
              </div>
            ) : (
              <div className="max-w-sm mx-auto w-full">
                <Tabs defaultValue="current" className="flex flex-col">
                  <TabsList className="w-full grid grid-cols-2 mb-6 bg-slate-100 p-1 rounded-lg h-auto">
                    <TabsTrigger
                      value="current"
                      className="rounded-md py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600"
                    >
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Dívida atual
                    </TabsTrigger>
                    <TabsTrigger
                      value="lifetime"
                      className="rounded-md py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Dívida de sempre
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="current" className="mt-0">
                    <p className="text-sm text-slate-500 mb-4">Quem deve mais neste momento.</p>
                    <ul className="space-y-2">
                      {byCurrentDebt.slice(0, 20).map((entry, i) => (
                        <li
                          key={entry.id}
                          className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors"
                        >
                          <span className="w-8 shrink-0 text-left text-slate-500 text-sm font-medium tabular-nums">
                            #{i + 1}
                          </span>
                          <span className="flex-1 min-w-0 text-center text-slate-900 text-sm font-medium truncate" title={entry.name}>
                            {entry.name}
                          </span>
                          <span className="w-16 shrink-0 text-right text-red-600 text-sm font-mono font-bold tabular-nums">
                            {formatDebt(entry.balance)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="lifetime" className="mt-0">
                    <p className="text-sm text-slate-500 mb-4">Maior dívida que já tiveram (histórico).</p>
                    <ul className="space-y-2">
                      {byLifetimeDebt.slice(0, 20).map((entry, i) => (
                        <li
                          key={entry.id}
                          className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors"
                        >
                          <span className="w-8 shrink-0 text-left text-slate-500 text-sm font-medium tabular-nums">
                            #{i + 1}
                          </span>
                          <span className="flex-1 min-w-0 text-center text-slate-900 text-sm font-medium truncate" title={entry.name}>
                            {entry.name}
                          </span>
                          <span className="w-16 shrink-0 text-right text-amber-600 text-sm font-mono font-bold tabular-nums">
                            {formatLifetime(entry.maxDebtEver)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
