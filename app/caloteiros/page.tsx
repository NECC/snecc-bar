"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getCaloteiros, type CaloteiroEntry } from "@/lib/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, TrendingDown, History, ArrowLeft, User, X, Clock } from "lucide-react"

export default function CaloteirosPage() {
  const [byCurrentDebt, setByCurrentDebt] = useState<CaloteiroEntry[]>([])
  const [byLifetimeDebt, setByLifetimeDebt] = useState<CaloteiroEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CaloteiroEntry | null>(null)

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
    balance < 0 ? `N${Math.abs(balance).toFixed(2)}` : "—"
  const formatLifetime = (total: number) => (total > 0 ? `N${total.toFixed(2)}` : "—")

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
                        <li key={entry.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(entry)}
                            className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 hover:shadow-sm active:scale-[0.99] cursor-pointer transition-all text-left"
                          >
                            <span className="w-6 shrink-0 text-slate-500 text-sm font-medium tabular-nums">
                              #{i + 1}
                            </span>
                            <span className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
                              {entry.avatarUrl ? (
                                <img src={entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-400" />
                              )}
                            </span>
                            <span className="flex-1 min-w-0 text-slate-900 text-sm font-medium truncate" title={entry.name}>
                              {entry.name}
                            </span>
                            <span className="w-16 shrink-0 text-right text-red-600 text-sm font-mono font-bold tabular-nums">
                              {formatDebt(entry.balance)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="lifetime" className="mt-0">
                    <p className="text-sm text-slate-500 mb-4">Total de dívida acumulada ao longo do tempo.</p>
                    <ul className="space-y-2">
                      {byLifetimeDebt.slice(0, 20).map((entry, i) => (
                        <li key={entry.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(entry)}
                            className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 hover:shadow-sm active:scale-[0.99] cursor-pointer transition-all text-left"
                          >
                            <span className="w-6 shrink-0 text-slate-500 text-sm font-medium tabular-nums">
                              #{i + 1}
                            </span>
                            <span className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
                              {entry.avatarUrl ? (
                                <img src={entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-400" />
                              )}
                            </span>
                            <span className="flex-1 min-w-0 text-slate-900 text-sm font-medium truncate" title={entry.name}>
                              {entry.name}
                            </span>
                            <span className="w-16 shrink-0 text-right text-amber-600 text-sm font-mono font-bold tabular-nums">
                              {formatLifetime(entry.totalDebtEver)}
                            </span>
                          </button>
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

      {selected && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setSelected(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl w-[90vw] max-w-sm z-50 border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors z-10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="bg-gradient-to-br from-slate-50 to-white p-6 pb-5 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 ring-4 ring-white shadow-lg flex items-center justify-center">
                {selected.avatarUrl ? (
                  <img src={selected.avatarUrl} alt={selected.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900 text-center">{selected.name}</h3>
            </div>

            <div className="p-5 pt-2 space-y-2.5">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                <span className="text-sm text-slate-700 font-medium">Dívida atual</span>
                <span className="text-sm font-mono font-bold text-red-600 tabular-nums">
                  {selected.balance < 0 ? `N${Math.abs(selected.balance).toFixed(2)}` : 'Em dia'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-sm text-slate-700 font-medium">Dívida de sempre</span>
                <span className="text-sm font-mono font-bold text-amber-600 tabular-nums">
                  N{selected.totalDebtEver.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-sm text-slate-700 font-medium">Pico histórico</span>
                <span className="text-sm font-mono font-bold text-slate-700 tabular-nums">
                  N{selected.maxDebtEver.toFixed(2)}
                </span>
              </div>
              {selected.debtStartedAt && selected.balance < 0 && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-sm text-slate-700 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Em dívida há
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-700 tabular-nums">
                    {Math.max(0, Math.floor((Date.now() - new Date(selected.debtStartedAt).getTime()) / 86400000))} dias
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
