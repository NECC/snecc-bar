"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, X, ShoppingCart, Trash2, XCircle, History, TrendingUp, Calendar } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

import {
  getCurrentUser,
  logout,
  addOrder,
  getProducts,
  getOrders,
  getDeposits,
  type User as UserType,
  type Product as ProductType,
  type Order,
  type Deposit,
} from "@/lib/auth"
import { AlertProvider, useAlert } from "@/components/ui/alert-dialog"

type DynamicProduct = {
  id: string
  name: string
  image: string
  price: number
  stock: number
  purchasePrice: number
  sellingPriceMember: number
  sellingPriceNonMember: number
}

type CartItem = {
  product: DynamicProduct
  quantity: number
}

type AnimatingProduct = {
  id: string
  image: string
  startX: number
  startY: number
  endX: number
  endY: number
}

function VendingMachineContent() {
  const { showAlert } = useAlert()
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCheckoutPageOpen, setIsCheckoutPageOpen] = useState(false)
  const [isCashPayment, setIsCashPayment] = useState(false)
  const [animatingProducts, setAnimatingProducts] = useState<AnimatingProduct[]>([])
  const [dynamicProducts, setDynamicProducts] = useState<DynamicProduct[]>([])
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [userDeposits, setUserDeposits] = useState<Deposit[]>([])
  const [clickingProducts, setClickingProducts] = useState<Set<string>>(new Set())
  const cartButtonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser()
      setCurrentUser(user)
      if (user) {
        // Load user orders and deposits
        const orders = await getOrders()
        const deposits = await getDeposits(user.id)
        setUserOrders(orders.filter(o => o.userId === user.id))
        setUserDeposits(deposits)
      }
    }
    init()
  }, [])

  useEffect(() => {
    // Load products from Supabase and adjust prices based on membership
    const loadProducts = async () => {
      const storedProducts = await getProducts()
      if (storedProducts.length > 0) {
        // Use member status from current user, or default to member prices
        const isMember = currentUser?.isMember ?? true

        setDynamicProducts(storedProducts.map(p => {
          // Use image from database, ensure proper path format
          let imagePath = p.image || ''
          // Ensure path starts with / if it's a local path (not a URL)
          if (imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('/')) {
            imagePath = '/' + imagePath
          }
          
          return {
            id: p.id,
            name: p.name,
            image: imagePath || '/placeholder.svg',
            price: isMember ? p.sellingPriceMember : p.sellingPriceNonMember,
            stock: p.stock,
            purchasePrice: p.purchasePrice,
            sellingPriceMember: p.sellingPriceMember,
            sellingPriceNonMember: p.sellingPriceNonMember,
          }
        }))
      }
    }
    loadProducts()
  }, [currentUser])

  const handleLogin = () => {
    setIsPopupOpen(false)
    router.push("/login")
  }

  const handleRegister = () => {
    setIsPopupOpen(false)
    router.push("/register")
  }

  const handleLogout = () => {
    logout()
    setCurrentUser(null)
    setCart([])
    setIsPopupOpen(false)
  }

  const handleProductClick = async (product: DynamicProduct, event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent multiple rapid clicks on the same product
    if (clickingProducts.has(product.id)) {
      return
    }

    if (!currentUser) {
      await showAlert({
        message: "Por favor, faça login para adicionar produtos ao carrinho",
        type: 'warning'
      })
      return
    }

    if (product.stock <= 0) {
      await showAlert({
        message: "Este produto está fora de stock",
        type: 'warning'
      })
      return
    }

    // Check stock before adding (using current cart state)
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.product.id === product.id)
      const currentQuantity = existingItem ? existingItem.quantity : 0

      if (currentQuantity + 1 > product.stock) {
        // Show alert asynchronously (can't await inside setState, but we can await in setTimeout)
        setTimeout(async () => {
          await showAlert({
            message: `Não há stock suficiente. Stock disponível: ${product.stock}`,
            type: 'warning'
          })
        }, 0)
        return currentCart
      }

      // Add to cart immediately
      if (existingItem) {
        return currentCart.map((item) => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      } else {
        return [...currentCart, { product, quantity: 1 }]
      }
    })

    // Mark product as being clicked to prevent rapid clicks
    setClickingProducts((prev) => new Set(prev).add(product.id))
    
    // Remove the lock after a short delay (much shorter than animation)
    setTimeout(() => {
      setClickingProducts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(product.id)
        return newSet
      })
    }, 100)

    // Start animation in parallel (doesn't block cart update)
    const productElement = event.currentTarget
    const productRect = productElement.getBoundingClientRect()
    const cartButton = cartButtonRef.current

    if (cartButton) {
      const cartRect = cartButton.getBoundingClientRect()

      const animatingProduct: AnimatingProduct = {
        id: `${product.id}-${Date.now()}-${Math.random()}`,
        image: product.image,
        startX: productRect.left + productRect.width / 2,
        startY: productRect.top + productRect.height / 2,
        endX: cartRect.left + cartRect.width / 2,
        endY: cartRect.top + cartRect.height / 2,
      }

      setAnimatingProducts((prev) => [...prev, animatingProduct])

      // Remove animation after it completes
      setTimeout(() => {
        setAnimatingProducts((prev) => prev.filter((p) => p.id !== animatingProduct.id))
      }, 600)
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity: newQuantity } : item)))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }

  const handleCheckout = async () => {
    // Validate stock before proceeding to checkout
    for (const item of cart) {
      const product = dynamicProducts.find(p => p.id === item.product.id)
      if (!product || item.quantity > product.stock) {
        await showAlert({
          message: `Stock insuficiente para ${item.product.name}. Disponível: ${product?.stock || 0}`,
          type: 'warning'
        })
        return
      }
    }
    setIsCheckoutOpen(false)
    setIsCheckoutPageOpen(true)
  }

  const completePurchase = async () => {
    if (!currentUser) {
      await showAlert({
        message: "Por favor, faça login para completar a compra",
        type: 'warning'
      })
      return
    }

    try {
      // Prepare order items - server will determine prices based on user's member status
      const orderItems = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }))

      const paymentMethod = isCashPayment ? 'cash' : 'balance'
      
      await addOrder(currentUser.id, orderItems, paymentMethod)

      // Reload user data to get updated balance
      const updatedUser = await getCurrentUser()
      if (updatedUser) {
        setCurrentUser(updatedUser)
        const orders = await getOrders()
        const deposits = await getDeposits(updatedUser.id)
        setUserOrders(orders.filter(o => o.userId === updatedUser.id))
        setUserDeposits(deposits)
      }

      // Reload products to update stock
      const storedProducts = await getProducts()
      const isMember = updatedUser?.isMember ?? currentUser?.isMember ?? true
      setDynamicProducts(storedProducts.map(p => {
        let imagePath = p.image || ''
        if (imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('/')) {
          imagePath = '/' + imagePath
        }
        
        return {
          id: p.id,
          name: p.name,
          image: imagePath || '/placeholder.svg',
          price: isMember ? p.sellingPriceMember : p.sellingPriceNonMember,
          stock: p.stock,
          purchasePrice: p.purchasePrice,
          sellingPriceMember: p.sellingPriceMember,
          sellingPriceNonMember: p.sellingPriceNonMember,
        }
      }))

      setCart([])
      setIsCheckoutPageOpen(false)
      setIsCashPayment(false)
      
      if (paymentMethod === 'balance') {
        await showAlert({
          message: `Compra realizada com sucesso! ${cart.length} item(s) dispensado(s). Saldo restante: א${updatedUser?.balance.toFixed(2) || '0.00'}`,
          type: 'success'
        })
      } else {
        await showAlert({
          message: `Compra realizada com sucesso! ${cart.length} item(s) dispensado(s).`,
          type: 'success'
        })
      }
    } catch (error: any) {
      console.error('Error completing purchase:', error)
      const errorMessage = error?.message || 'Erro ao completar a compra. Por favor, tente novamente.'
      await showAlert({
        message: errorMessage,
        type: 'error'
      })
    }
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex flex-col">
      {/* Header Fixo */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <img src="/favicon.ico" alt="NECC Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  sNECC-Bar
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Sistema de gestão de stock do bar do NECC</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPopupOpen(true)}
                className="h-10 w-10 hover:bg-slate-100"
              >
                <User className="w-5 h-5" />
              </Button>
              <Button
                ref={cartButtonRef}
                variant="ghost"
                size="icon"
                onClick={() => setIsCheckoutOpen(true)}
                className="relative h-10 w-10 hover:bg-slate-100"
              >
                <ShoppingCart className="w-5 h-5" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                    {getTotalItems()}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Layout Principal - Produtos ocupam todo o espaço */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto w-full flex flex-col">
        <main className="flex-1 flex flex-col">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8 flex-1 flex flex-col min-h-[calc(100vh-12rem)]">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1">Produtos Disponíveis</h2>
              <p className="text-sm text-slate-500">Clique para adicionar ao carrinho</p>
            </div>
            
            {dynamicProducts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-16">
                  <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">Nenhum produto disponível</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 lg:gap-6 content-start">
                {dynamicProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group relative"
                  >
                    <button
                      onClick={(e) => handleProductClick(product, e)}
                      disabled={product.stock <= 0}
                      className={`w-full relative bg-white rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                        product.stock <= 0
                          ? 'border-slate-200 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-cyan-400 hover:shadow-xl hover:-translate-y-1 active:scale-95'
                      }`}
                    >
                      {/* Stock Badge */}
                      {product.stock > 0 && product.stock < 5 && (
                        <div className="absolute top-2 right-2 z-10 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                          {product.stock} restantes
                        </div>
                      )}
                      
                      {/* Out of Stock Overlay */}
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                          <XCircle className="w-10 h-10 text-red-500 mb-2" />
                          <span className="text-xs font-semibold text-red-600">Sem Stock</span>
                        </div>
                      )}

                      {/* Product Image */}
                      <div className="aspect-square p-4 sm:p-6 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            if (!target.dataset.fallbackAttempted && !target.src.includes('placeholder.svg') && !target.src.includes('data:image')) {
                              target.dataset.fallbackAttempted = 'true'
                              target.src = '/placeholder.svg'
                            } else if (!target.src.includes('data:image')) {
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
                            }
                          }}
                        />
                      </div>

                      {/* Product Info */}
                      <div className="p-3 sm:p-4 border-t border-slate-100">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                            א{product.price.toFixed(2)}
                          </span>
                          {product.stock > 0 && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {animatingProducts.map((animProduct) => (
        <div
          key={animProduct.id}
          className="fixed pointer-events-none z-[100]"
          style={
            {
              left: `${animProduct.startX}px`,
              top: `${animProduct.startY}px`,
              animation: `dropToCart 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
              "--end-x": `${animProduct.endX - animProduct.startX}px`,
              "--end-y": `${animProduct.endY - animProduct.startY}px`,
            } as React.CSSProperties
          }
        >
          <img src={animProduct.image || "/logonecc.png"} alt="Product" className="w-16 h-16 object-contain" />
        </div>
      ))}

      {isPopupOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200 " onClick={() => setIsPopupOpen(false)} />

          <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-white to-slate-50 p-6 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md z-50 border-0 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto hide-scrollbar">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPopupOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </Button>

            <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 text-3xl sm:text-4xl font-bold text-center mb-2">{currentUser !== null ? "Detalhes da conta" : "Login / Registo"}</h2>
            <p className="text-slate-500 text-sm text-center mb-8">Detalhes da conta e histórico</p>

            <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full p-4 shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-lg">{currentUser?.name || "Guest"}</p>
                {currentUser?.email && (
                  <p className="text-slate-600 text-sm">{currentUser.email}</p>
                )}
                <p className="text-cyan-600 font-bold mt-2 text-lg">
                  א{currentUser?.balance !== undefined ? currentUser.balance.toFixed(2) : "0.00"}
                </p>
                {currentUser && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${currentUser.isMember ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                      {currentUser.isMember ? 'Membro NECC' : 'Não Membro'}
                    </span>
                    {currentUser.createdAt && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-white px-2 py-1 rounded-full">
                        <Calendar className="w-3 h-3" />
                        {new Date(currentUser.createdAt).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {currentUser && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 text-center border border-cyan-200 shadow-sm">
                  <p className="text-xs text-slate-600 mb-2 font-medium">Total Gasto</p>
                  <p className="text-xl font-bold text-cyan-600">
                    א{userOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 text-center border border-cyan-200 shadow-sm">
                  <p className="text-xs text-slate-600 mb-2 font-medium">Nº de compras</p>
                  <p className="text-xl font-bold text-cyan-600">{userOrders.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200 shadow-sm">
                  <p className="text-xs text-slate-600 mb-2 font-medium">Total Depositado</p>
                  <p className="text-xl font-bold text-green-600">
                    א{userDeposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200 shadow-sm">
                  <p className="text-xs text-slate-600 mb-2 font-medium">Depósitos</p>
                  <p className="text-xl font-bold text-green-600">{userDeposits.length}</p>
                </div>
              </div>
            )}

            {currentUser && (
              <div className="mt-4">
                <Tabs defaultValue="orders" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1">
                    <TabsTrigger value="orders" className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all">
                      <History className="w-3 h-3 mr-1" />
                      Compras ({userOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="deposits" className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Depósitos ({userDeposits.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="orders" className="mt-3">
                    <div className="max-h-64 overflow-y-auto space-y-2 hide-scrollbar">
                      {userOrders.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-xl">Nenhuma compra efetuada</p>
                      ) : (
                        userOrders.slice(0, 10).map((order) => (
                          <div key={order.id} className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-3 text-xs border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-slate-600 font-semibold">
                                {new Date(order.timestamp).toLocaleDateString('pt-PT', { 
                                  day: '2-digit', 
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="font-bold text-cyan-600 text-sm">א{order.total.toFixed(2)}</span>
                            </div>
                            <div className="text-slate-500 truncate mb-1">
                              {order.items.map((item, idx) => (
                                <span key={idx}>
                                  {item.productName} x{item.quantity}
                                  {idx < order.items.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                            <div className="text-slate-400 text-xs">
                              {order.paymentMethod === 'balance' ? '💳 Saldo' : '💵 Dinheiro'}
                            </div>
                          </div>
                        ))
                      )}
                      {userOrders.length > 10 && (
                        <p className="text-xs text-slate-400 text-center pt-2">
                          Mostrando últimas 10 de {userOrders.length}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="deposits" className="mt-3">
                    <div className="max-h-64 overflow-y-auto space-y-2 hide-scrollbar">
                      {userDeposits.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-xl">Nenhum depósito registado</p>
                      ) : (
                        userDeposits.slice(0, 10).map((deposit) => (
                          <div key={deposit.id} className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-3 text-xs border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-slate-600 font-semibold">
                                {new Date(deposit.timestamp).toLocaleDateString('pt-PT', { 
                                  day: '2-digit', 
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className={`font-bold text-sm ${deposit.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {deposit.amount >= 0 ? '+' : ''}א{deposit.amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-slate-400 text-xs">
                              {deposit.method === 'cash' ? '💵 Dinheiro' : deposit.method === 'mbway' ? '📱 MB Way' : '⚙️ Ajuste'}
                            </div>
                          </div>
                        ))
                      )}
                      {userDeposits.length > 10 && (
                        <p className="text-xs text-slate-400 text-center pt-2">
                          Últimos 10 depósitos de {userDeposits.length}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {currentUser ? (
              <div className="space-y-3 mt-6">
                {currentUser.role === "admin" && (
                  <Button
                    onClick={() => {
                      setIsPopupOpen(false)
                      router.push("/admin")
                    }}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg rounded-xl py-6 text-lg font-semibold transition-all"
                  >
                    Admin Panel
                  </Button>
                )}
                <Button onClick={handleLogout} className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg rounded-xl py-6 text-lg font-semibold transition-all">
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 mt-6">
                <Button onClick={handleLogin} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg rounded-xl py-6 text-base font-semibold transition-all">
                  Login
                </Button>
                <Button onClick={handleRegister} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg rounded-xl py-6 text-base font-semibold transition-all">
                  Register
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      {isCheckoutOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={() => setIsCheckoutOpen(false)} />

          <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-white to-slate-50 p-6 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md sm:w-[500px] max-h-[80vh] overflow-y-auto z-50 border-0 animate-in zoom-in-95 duration-300">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </Button>

            <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 text-3xl sm:text-4xl font-bold text-center mb-2">Checkout</h2>
            <p className="text-slate-500 text-sm text-center mb-8">Verifique os seus produtos</p>

            {cart.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-xl font-semibold">O seu carrinho está vazio</p>
                <p className="text-slate-400 text-sm mt-2">Adicione alguns produtos para começar</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      <img
                        src={item.product.image || "/placeholder.svg"}
                        alt={item.product.name}
                        className="w-16 h-16 object-contain bg-white rounded-lg p-2 border border-slate-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          if (!target.dataset.fallbackAttempted && !target.src.includes('placeholder.svg') && !target.src.includes('data:image')) {
                            target.dataset.fallbackAttempted = 'true'
                            target.src = '/placeholder.svg'
                          } else if (!target.src.includes('data:image')) {
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{item.product.name}</p>
                        <p className="text-sm text-slate-500">א{item.product.price.toFixed(2)} cada</p>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-white hover:bg-slate-200 border-slate-300"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-bold text-slate-800">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-white hover:bg-slate-200 border-slate-300"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-slate-200 pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-slate-700">Total:</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">א{getCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                    <span className="text-sm text-slate-600 font-medium">Saldo Disponível:</span>
                    <span className="font-bold text-slate-800">א{currentUser?.balance.toFixed(2) || "0.00"}</span>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-lg py-6 rounded-xl shadow-lg font-semibold transition-all"
                    disabled={!currentUser}
                  >
                    {!currentUser ? "Login Necessário" : "Finalizar Compra"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {isCheckoutPageOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={() => setIsCheckoutPageOpen(false)} />

          <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-white to-slate-50 p-6 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md sm:w-[500px] z-50 border-0 animate-in zoom-in-95 duration-300">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCheckoutPageOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </Button>

            <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 text-3xl sm:text-4xl font-bold text-center mb-2">Finalizar Compra</h2>
            <p className="text-slate-500 text-sm text-center mb-8">Confirme os detalhes do seu pedido</p>

            <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-lg">Resumo do Pedido</h3>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center text-sm p-2 bg-white rounded-lg">
                    <span className="text-slate-600 font-medium">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-bold text-slate-800">
                      א{(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-slate-200 mt-4 pt-4 flex justify-between items-center">
                <span className="font-bold text-slate-800 text-lg">Total:</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">א{getCartTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-6">
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer ${
                isCashPayment 
                  ? 'border-cyan-500 bg-cyan-50 shadow-md' 
                  : 'border-slate-200 hover:border-cyan-300 bg-white'
              }`}
              onClick={() => setIsCashPayment(!isCashPayment)}
              >
                <Checkbox
                  id="cashPayment"
                  checked={isCashPayment}
                  onCheckedChange={(checked) => setIsCashPayment(checked as boolean)}
                  className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                />
                <label htmlFor="cashPayment" className="text-slate-800 font-semibold cursor-pointer flex-1">
                  Pagamento em dinheiro
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-2 ml-11">
                Se selecionar pagamento em dinheiro, o saldo não será cobrado
              </p>
            </div>

            {!isCashPayment && (
              <div className="flex justify-between items-center mb-6 text-sm p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 shadow-sm">
                <span className="text-slate-600 font-medium">Saldo Disponível:</span>
                <span className="font-bold text-slate-800 text-lg">א{currentUser?.balance.toFixed(2) || "0.00"}</span>
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={completePurchase}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-lg py-6 rounded-xl shadow-lg font-semibold transition-all"
                disabled={!currentUser}
              >
                {!currentUser ? "Login Necessário" : "Confirmar Compra"}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default function VendingMachine() {
  return (
    <AlertProvider>
      <VendingMachineContent />
    </AlertProvider>
  )
}
