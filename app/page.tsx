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
          message: `Compra realizada com sucesso! ${cart.length} item(s) dispensado(s). Saldo restante: €${updatedUser?.balance.toFixed(2) || '0.00'}`,
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
    <div className="min-h-screen bg-neutral-200 p-4 sm:p-8 flex items-center justify-center relative">
      <Card className="bg-cyan-500 p-4 sm:p-8 rounded-3xl shadow-2xl max-w-2xl w-full">
        <div className="bg-neutral-900 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <h1 className="text-cyan-400 text-xl font-semibold">Bem vindo ao sNECC-Bar</h1>
          <div className="bg-white rounded-lg p-2">
            <img src="/favicon.ico" alt="NECC Logo" className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {dynamicProducts.map((product) => (
              <div key={product.id} className="flex flex-col items-center">
                <button
                  onClick={(e) => handleProductClick(product, e)}
                  className={`border-4 border-neutral-300 rounded-xl p-2 sm:p-4 bg-white w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center mb-2 hover:border-cyan-400 hover:shadow-lg transition-all cursor-pointer active:scale-95 ${
                    product.stock <= 0 ? 'cursor-not-allowed' : ''
                  }`}
                  disabled={product.stock <= 0}
                >
                  {product.stock <= 0 ? (
                    <div className="flex flex-col items-center justify-center">
                      <XCircle className="w-12 h-12 sm:w-8 sm:h-8 text-red-500 mb-1" />
                      <span className="text-sm sm:text-xs text-red-500 font-medium">Out of Stock</span>
                    </div>
                  ) : (
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement
                        // Prevent infinite loop by checking if we've already tried the placeholder
                        if (!target.dataset.fallbackAttempted && !target.src.includes('placeholder.svg') && !target.src.includes('data:image')) {
                          target.dataset.fallbackAttempted = 'true'
                          target.src = '/placeholder.svg'
                        } else if (!target.src.includes('data:image')) {
                          // If placeholder also fails, use a data URI as last resort
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
                        }
                      }}
                    />
                  )}
                </button>
                <span className="text-sm text-cyan-600 font-medium">€{product.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-2xl p-4 mt-6 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPopupOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-neutral-800"
          >
            <User className="w-6 h-6" />
          </Button>
          <Button
            ref={cartButtonRef}
            variant="ghost"
            size="icon"
            onClick={() => setIsCheckoutOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-neutral-800 relative"
          >
            <ShoppingCart className="w-6 h-6" />
            {getTotalItems() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {getTotalItems()}
              </span>
            )}
          </Button>
        </div>
      </Card>

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
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsPopupOpen(false)} />

          <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md z-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPopupOpen(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </Button>

            <h2 className="text-cyan-500 text-3xl font-bold text-center mb-6">Área do aluno</h2>

            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-500 rounded-full p-3">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-neutral-800 text-lg">{currentUser?.name || "Guest"}</p>
                {currentUser?.email && (
                  <p className="text-neutral-600 text-sm">{currentUser.email}</p>
                )}
                <p className="text-cyan-500 font-medium mt-1">
                  Balance: €{currentUser?.balance !== undefined ? currentUser.balance.toFixed(2) : "0.00"}
                </p>
                {currentUser && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                    <span className={`px-2 py-1 rounded ${currentUser.isMember ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {currentUser.isMember ? 'Membro NECC' : 'Não Membro'}
                    </span>
                    {currentUser.createdAt && (
                      <span className="flex items-center gap-1">
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
                <div className="bg-cyan-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-neutral-600 mb-1">Total Gasto</p>
                  <p className="text-lg font-bold text-cyan-600">
                    €{userOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-cyan-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-neutral-600 mb-1">Encomendas</p>
                  <p className="text-lg font-bold text-cyan-600">{userOrders.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-neutral-600 mb-1">Total Depositado</p>
                  <p className="text-lg font-bold text-green-600">
                    €{userDeposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-neutral-600 mb-1">Depósitos</p>
                  <p className="text-lg font-bold text-green-600">{userDeposits.length}</p>
                </div>
              </div>
            )}

            {currentUser && (
              <div className="mt-4">
                <Tabs defaultValue="orders" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-neutral-200">
                    <TabsTrigger value="orders" className="text-xs sm:text-sm text-neutral-800 data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                      <History className="w-3 h-3 mr-1" />
                      Encomendas ({userOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="deposits" className="text-xs sm:text-sm text-neutral-800 data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Depósitos ({userDeposits.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="orders" className="mt-3">
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                      {userOrders.length === 0 ? (
                        <p className="text-xs text-neutral-500 text-center py-4">Nenhuma encomenda ainda</p>
                      ) : (
                        userOrders.slice(0, 10).map((order) => (
                          <div key={order.id} className="bg-neutral-50 rounded-lg p-2.5 text-xs border border-neutral-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-neutral-600 font-medium">
                                {new Date(order.timestamp).toLocaleDateString('pt-PT', { 
                                  day: '2-digit', 
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="font-bold text-cyan-600">€{order.total.toFixed(2)}</span>
                            </div>
                            <div className="text-neutral-500 truncate">
                              {order.items.map((item, idx) => (
                                <span key={idx}>
                                  {item.productName} x{item.quantity}
                                  {idx < order.items.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                            <div className="text-neutral-400 mt-0.5">
                              {order.paymentMethod === 'balance' ? 'Saldo' : 'Dinheiro'}
                            </div>
                          </div>
                        ))
                      )}
                      {userOrders.length > 10 && (
                        <p className="text-xs text-neutral-400 text-center pt-1">
                          Mostrando últimas 10 de {userOrders.length}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="deposits" className="mt-3">
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                      {userDeposits.length === 0 ? (
                        <p className="text-xs text-neutral-500 text-center py-4">Nenhum depósito registado</p>
                      ) : (
                        userDeposits.slice(0, 10).map((deposit) => (
                          <div key={deposit.id} className="bg-neutral-50 rounded-lg p-2.5 text-xs border border-neutral-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-neutral-600 font-medium">
                                {new Date(deposit.timestamp).toLocaleDateString('pt-PT', { 
                                  day: '2-digit', 
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className={`font-bold ${deposit.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {deposit.amount >= 0 ? '+' : ''}€{deposit.amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-neutral-400">
                              {deposit.method === 'cash' ? 'Dinheiro' : deposit.method === 'mbway' ? 'MB Way' : 'Ajuste'}
                            </div>
                          </div>
                        ))
                      )}
                      {userDeposits.length > 10 && (
                        <p className="text-xs text-neutral-400 text-center pt-1">
                          Mostrando últimos 10 de {userDeposits.length}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {currentUser ? (
              <div className="space-y-3 mt-4">
                {currentUser.role === "admin" && (
                  <Button
                    onClick={() => {
                      setIsPopupOpen(false)
                      router.push("/admin")
                    }}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    Admin Panel
                  </Button>
                )}
                <Button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white">
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 mt-4">
                <Button onClick={handleLogin} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white">
                  Login
                </Button>
                <Button onClick={handleRegister} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white">
                  Register
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      {isCheckoutOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCheckoutOpen(false)} />

          <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md sm:w-[500px] max-h-[80vh] overflow-y-auto z-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </Button>

            <h2 className="text-cyan-500 text-3xl font-bold text-center mb-6">Checkout</h2>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 text-lg">Your cart is empty</p>
                <p className="text-neutral-400 text-sm mt-2">Add some products to get started</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-4 p-4 border-2 border-neutral-200 rounded-xl"
                    >
                      <img
                        src={item.product.image || "/placeholder.svg"}
                        alt={item.product.name}
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          // Prevent infinite loop by checking if we've already tried the placeholder
                          if (!target.dataset.fallbackAttempted && !target.src.includes('placeholder.svg') && !target.src.includes('data:image')) {
                            target.dataset.fallbackAttempted = 'true'
                            target.src = '/placeholder.svg'
                          } else if (!target.src.includes('data:image')) {
                            // If placeholder also fails, use a data URI as last resort
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-800">{item.product.name}</p>
                        <p className="text-sm text-neutral-500">€{item.product.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-neutral-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-neutral-800">Total:</span>
                    <span className="text-2xl font-bold text-cyan-500">€{getCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-neutral-600">Your Balance:</span>
                    <span className="font-semibold text-neutral-800">€{currentUser?.balance.toFixed(2) || "0.00"}</span>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white text-lg py-6"
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
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCheckoutPageOpen(false)} />

          <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md sm:w-[500px] z-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCheckoutPageOpen(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </Button>

            <h2 className="text-cyan-500 text-3xl font-bold text-center mb-8">Finalizar Compra</h2>

            <div className="mb-6 p-4 bg-neutral-50 rounded-xl">
              <h3 className="font-semibold text-neutral-800 mb-3">Resumo do Pedido</h3>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-neutral-600">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-neutral-800">
                      €{(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-200 mt-3 pt-3 flex justify-between">
                <span className="font-semibold text-neutral-800">Total:</span>
                <span className="text-xl font-bold text-cyan-500">€{getCartTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center space-x-3 p-4 border-2 border-neutral-200 rounded-xl hover:border-cyan-400 transition-colors">
                <Checkbox
                  id="cashPayment"
                  checked={isCashPayment}
                  onCheckedChange={(checked) => setIsCashPayment(checked as boolean)}
                  className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                />
                <label htmlFor="cashPayment" className="text-neutral-800 font-medium cursor-pointer flex-1">
                  Pagamento em dinheiro
                </label>
              </div>
              <p className="text-xs text-neutral-500 mt-2 ml-11">
                Se selecionar pagamento em dinheiro, o saldo não será cobrado
              </p>
            </div>

            {!isCashPayment && (
              <div className="flex justify-between items-center mb-6 text-sm p-4 bg-cyan-50 rounded-xl">
                <span className="text-neutral-600">Saldo Disponível:</span>
                <span className="font-semibold text-neutral-800">€{currentUser?.balance.toFixed(2) || "0.00"}</span>
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={completePurchase}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white text-lg py-6"
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
